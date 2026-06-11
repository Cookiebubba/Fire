import Peer, { type DataConnection, type PeerJSOption } from 'peerjs';

/**
 * P2P co-op over WebRTC (PeerJS). The host's browser IS the server:
 * hosting generates a 6-char invite code (the room's peer id), friends join
 * with the code. Star topology — the host relays state and arbitrates
 * who owns each water source. No game servers anywhere.
 */

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L
const ROOM_PREFIX = 'fire-yard-v1-';

/**
 * Default: PeerJS public cloud broker. Self-hosters (or offline LANs) can
 * point at their own `npx peer` server with `?peer=host:port`.
 */
function peerOptions(): PeerJSOption | undefined {
  const q = new URLSearchParams(location.search).get('peer');
  if (!q) return undefined;
  const [host, port] = q.split(':');
  return {
    host,
    port: Number(port ?? '443'),
    path: '/',
    secure: location.protocol === 'https:' && host !== 'localhost',
  };
}

export function generateCode(): string {
  let c = '';
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  for (const b of bytes) c += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return c;
}

export interface WireState {
  p: [number, number, number];
  v: [number, number, number];
  yaw: number;
  pitch: number;
  spd: number;
  run: number;
  gnd: 0 | 1;
  cr: number;
  dep: 0 | 1;
  spr: 0 | 1;
  mode: number;
  src: string | null;
  len: number;
}

type Msg =
  | { t: 'hello'; name: string }
  | { t: 'welcome'; peers: Array<{ id: string; name: string }>; claims: Record<string, string>; reservoirs: Record<string, number> }
  | { t: 'join'; id: string; name: string }
  | { t: 'leave'; id: string }
  | { t: 'state'; s: WireState }
  | { t: 'rstate'; id: string; s: WireState }
  | { t: 'claim'; src: string }
  | { t: 'release'; src: string }
  | { t: 'claimed'; src: string; id: string }
  | { t: 'released'; src: string }
  | { t: 'deny'; src: string }
  | { t: 'res'; levels: Record<string, number> };

export type NetRole = 'offline' | 'host' | 'client';

export class Net {
  role: NetRole = 'offline';
  code = '';
  selfId = 'local';
  selfName = `TANK-${Math.floor(Math.random() * 90 + 10)}`;
  peerNames = new Map<string, string>();

  private peer: Peer | null = null;
  private conns = new Map<string, DataConnection>();
  private claims = new Map<string, string>();

  onStatus: (text: string, kind: 'info' | 'ok' | 'err') => void = () => {};
  onPeerJoin: (id: string, name: string) => void = () => {};
  onPeerLeave: (id: string) => void = () => {};
  onPeerState: (id: string, s: WireState) => void = () => {};
  onClaim: (src: string, peerId: string) => void = () => {};
  onRelease: (src: string) => void = () => {};
  onDeny: (src: string) => void = () => {};
  onReservoirs: (levels: Record<string, number>) => void = () => {};

  get connectedCount(): number {
    return this.conns.size;
  }

  host(): void {
    if (this.role !== 'offline') return;
    this.code = generateCode();
    this.role = 'host';
    this.onStatus('Opening room…', 'info');
    this.peer = new Peer(ROOM_PREFIX + this.code, peerOptions());

    this.peer.on('open', (id) => {
      this.selfId = id;
      this.onStatus(`Hosting — share code ${this.code}`, 'ok');
    });
    this.peer.on('connection', (conn) => this.setupHostConn(conn));
    this.peer.on('error', (err) => {
      this.onStatus(`Network error: ${err.type}`, 'err');
      if (err.type === 'unavailable-id') this.reset();
    });
  }

  join(code: string): void {
    if (this.role !== 'offline') return;
    this.code = code.toUpperCase().trim();
    this.role = 'client';
    this.onStatus('Connecting…', 'info');
    const opts = peerOptions();
    this.peer = opts ? new Peer(opts) : new Peer();

    this.peer.on('open', (id) => {
      this.selfId = id;
      const conn = this.peer!.connect(ROOM_PREFIX + this.code, { reliable: true });
      conn.on('open', () => {
        this.conns.set('host', conn);
        this.send(conn, { t: 'hello', name: this.selfName });
        this.onStatus('Connected!', 'ok');
      });
      conn.on('data', (d) => this.handleClient(d as Msg));
      conn.on('close', () => {
        this.onStatus('Host disconnected', 'err');
        this.disbandPeers();
        this.reset();
      });
      conn.on('error', () => this.onStatus('Connection failed — check the code', 'err'));
    });
    this.peer.on('error', (err) => {
      this.onStatus(
        err.type === 'peer-unavailable' ? 'No room with that code' : `Network error: ${err.type}`,
        'err',
      );
      if (err.type === 'peer-unavailable') this.reset();
    });
  }

  private setupHostConn(conn: DataConnection): void {
    conn.on('open', () => {
      this.conns.set(conn.peer, conn);
    });
    conn.on('data', (d) => this.handleHost(conn, d as Msg));
    conn.on('close', () => {
      this.conns.delete(conn.peer);
      this.peerNames.delete(conn.peer);
      // free their sources
      for (const [src, owner] of [...this.claims]) {
        if (owner === conn.peer) {
          this.claims.delete(src);
          this.broadcast({ t: 'released', src });
          this.onRelease(src);
        }
      }
      this.broadcast({ t: 'leave', id: conn.peer });
      this.onPeerLeave(conn.peer);
      this.onStatus(`Player left (${this.conns.size} connected)`, 'info');
    });
  }

  // -------------------------------------------------- host message pump
  private handleHost(conn: DataConnection, msg: Msg): void {
    switch (msg.t) {
      case 'hello': {
        this.peerNames.set(conn.peer, msg.name);
        const peers = [{ id: this.selfId, name: this.selfName }];
        for (const [id, name] of this.peerNames) if (id !== conn.peer) peers.push({ id, name });
        this.send(conn, {
          t: 'welcome',
          peers,
          claims: Object.fromEntries(this.claims),
          reservoirs: {},
        });
        this.broadcast({ t: 'join', id: conn.peer, name: msg.name }, conn.peer);
        this.onPeerJoin(conn.peer, msg.name);
        this.onStatus(`${msg.name} joined (${this.conns.size} connected)`, 'ok');
        break;
      }
      case 'state':
        this.onPeerState(conn.peer, msg.s);
        this.broadcast({ t: 'rstate', id: conn.peer, s: msg.s }, conn.peer);
        break;
      case 'claim':
        this.arbitrateClaim(msg.src, conn.peer, conn);
        break;
      case 'release':
        if (this.claims.get(msg.src) === conn.peer) {
          this.claims.delete(msg.src);
          this.broadcast({ t: 'released', src: msg.src });
          this.onRelease(msg.src);
        }
        break;
      default:
        break;
    }
  }

  private arbitrateClaim(src: string, peerId: string, requesterConn: DataConnection | null): void {
    const owner = this.claims.get(src);
    if (owner === undefined || owner === peerId) {
      this.claims.set(src, peerId);
      this.broadcast({ t: 'claimed', src, id: peerId });
      this.onClaim(src, peerId);
    } else if (requesterConn) {
      this.send(requesterConn, { t: 'deny', src });
    } else {
      this.onDeny(src);
    }
  }

  // ------------------------------------------------ client message pump
  private handleClient(msg: Msg): void {
    switch (msg.t) {
      case 'welcome':
        for (const p of msg.peers) {
          this.peerNames.set(p.id, p.name);
          this.onPeerJoin(p.id, p.name);
        }
        for (const [src, id] of Object.entries(msg.claims)) this.onClaim(src, id);
        break;
      case 'join':
        this.peerNames.set(msg.id, msg.name);
        this.onPeerJoin(msg.id, msg.name);
        this.onStatus(`${msg.name} joined`, 'ok');
        break;
      case 'leave':
        this.peerNames.delete(msg.id);
        this.onPeerLeave(msg.id);
        break;
      case 'rstate':
        this.onPeerState(msg.id, msg.s);
        break;
      case 'claimed':
        this.onClaim(msg.src, msg.id);
        break;
      case 'released':
        this.onRelease(msg.src);
        break;
      case 'deny':
        this.onDeny(msg.src);
        break;
      case 'res':
        this.onReservoirs(msg.levels);
        break;
      default:
        break;
    }
  }

  // ----------------------------------------------------------- outbound
  sendState(s: WireState): void {
    if (this.role === 'host') {
      this.broadcast({ t: 'rstate', id: this.selfId, s });
    } else if (this.role === 'client') {
      const host = this.conns.get('host');
      if (host) this.send(host, { t: 'state', s });
    }
  }

  /** Ask to own a source. Resolves via onClaim/onDeny (instant offline). */
  requestClaim(src: string): void {
    if (this.role === 'client') {
      const host = this.conns.get('host');
      if (host) this.send(host, { t: 'claim', src });
    } else {
      this.arbitrateClaim(src, this.selfId, null);
    }
  }

  requestRelease(src: string): void {
    if (this.role === 'client') {
      const host = this.conns.get('host');
      if (host) this.send(host, { t: 'release', src });
    } else {
      if (this.claims.get(src) === this.selfId) this.claims.delete(src);
      this.broadcast({ t: 'released', src });
      this.onRelease(src);
    }
  }

  /** Host: push authoritative reservoir levels (drift correction). */
  broadcastReservoirs(levels: Record<string, number>): void {
    if (this.role === 'host') this.broadcast({ t: 'res', levels });
  }

  private send(conn: DataConnection, msg: Msg): void {
    if (conn.open) conn.send(msg);
  }

  private broadcast(msg: Msg, exceptPeer?: string): void {
    for (const [id, conn] of this.conns) {
      if (id !== exceptPeer && conn.peer !== exceptPeer) this.send(conn, msg);
    }
  }

  private disbandPeers(): void {
    for (const id of this.peerNames.keys()) this.onPeerLeave(id);
    this.peerNames.clear();
  }

  private reset(): void {
    this.peer?.destroy();
    this.peer = null;
    this.conns.clear();
    this.role = 'offline';
    this.selfId = 'local';
    this.code = '';
  }
}
