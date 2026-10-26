// Cosmetic herd simulation. Gameplay and rewards remain independent of animation time.
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
export const PEN_SIZE = 280;
export const TROUGH = Object.freeze({ u:145, v:22, radius:26 });
export const project = (u, v) => ({ x: 370 + u - v, y: 190 + (u + v) * .5 });
export const footprint = a => ({ cow: 14, chicken: 9, sheep: 13, pig: 12 }[a.type] || 12) * (a.type === 'pig' ? .65 + a.growth * .175 : 1);

export function createHerd(animals, seed = 52) {
  let randomState = seed >>> 0, time = 0;
  const random = () => { randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0; return randomState / 4294967296; };
  const actors = animals.map((a, i) => ({
    id: i, u: 42 + i % 4 * 62, v: 42 + Math.floor(i / 4) * 30,
    radius: footprint(a), target: null, wait: .15 + random() * 3,
    speed: 13 + random() * 5, distance: random() * 16, facing: 1, turnAfter:0, vx:0, vy:0,
    moving: false, active: !a.sold, eatUntil: 0, blocked: 0,
  }));
  let identities=animals.map((a,i)=>a.id??i);
  function sync(next){
    const old=new Map(actors.map((a,i)=>[identities[i],a]));
    const updated=next.map((a,i)=>{const actor=old.get(a.id??i);return actor?{...actor,id:i}:{id:i,u:42+i%4*62,v:42+Math.floor(i/4)*30,radius:footprint(a),target:null,wait:random()*3,speed:13+random()*5,distance:0,facing:1,turnAfter:0,vx:0,vy:0,moving:false,active:!a.sold,eatUntil:0,blocked:0};});
    actors.splice(0,actors.length,...updated);animals=next;identities=next.map((a,i)=>a.id??i);step(0);
  }
  const bounded = a => { a.u = clamp(a.u, a.radius + 5, PEN_SIZE - a.radius - 5); a.v = clamp(a.v, a.radius + 5, PEN_SIZE - a.radius - 5); };
  function settle() {
    for (let pass = 0; pass < 18; pass++) {
      let penetration = 0;
      for (let i = 0; i < actors.length; i++) {
        const a = actors[i]; if (!a.active) continue;
        const ou=a.u-TROUGH.u,ov=a.v-TROUGH.v,od=Math.hypot(ou,ov),limit=a.radius+TROUGH.radius+2;
        if(od<limit){const n=od||1;a.u=TROUGH.u+(od?ou:0)/n*limit;a.v=TROUGH.v+(od?ov:1)/n*limit;bounded(a);penetration=Math.max(penetration,limit-od);}
        for (let j = i + 1; j < actors.length; j++) {
          const b = actors[j]; if (!b.active) continue;
          let du = b.u - a.u, dv = b.v - a.v, d = Math.hypot(du, dv);
          const minimum = a.radius + b.radius + 2;
          if (d >= minimum) continue;
          if (d < .0001) { du = 1; dv = 0; d = 1; }
          const overlap = minimum - d, push = overlap / 2;
          penetration = Math.max(penetration, overlap);
          a.u -= du / d * push; a.v -= dv / d * push;
          b.u += du / d * push; b.v += dv / d * push;
          bounded(a); bounded(b);
        }
      }
      if (penetration < .001) break;
    }
  }
  function gather(id) {
    const targets = id === undefined ? actors : [actors[id]];
    targets.forEach(a => {
      if (!a?.active || animals[a.id].dead) return;
      // Separate places around the trough, rather than a single shared destination.
      const angle = (.12 + (a.id % 8) / 8 * .78) * Math.PI;
      const radius = 54 + Math.floor(a.id / 8) * 42;
      a.target = { u: 145 + Math.cos(angle) * radius, v: 28 + Math.sin(angle) * radius, food: true };
      a.wait = 0; a.blocked = 0;
    });
  }
  function step(delta) {
    const dt = clamp(Number.isFinite(delta) ? delta : 0, 0, .08);
    time += dt;
    const before = actors.map(a => ({ u: a.u, v: a.v }));
    for (const a of actors) {
      a.active = !animals[a.id].sold; a.radius = footprint(animals[a.id]); a.moving = false;
      if (!a.active) continue;
      bounded(a);
      if(animals[a.id].dead){a.target=null;a.vx=0;a.vy=0;continue;}
      if (a.wait > 0) { a.wait -= dt; continue; }
      if (!a.target) {
        a.target = { u: clamp(a.u + (random() - .5) * 140, 30, 250), v: clamp(a.v + (random() - .5) * 140, 30, 250) };
      }
      let du = a.target.u - a.u, dv = a.target.v - a.v;
      const distance = Math.hypot(du, dv);
      if (distance < 5) {
        a.eatUntil = a.target.food ? time + 3 : 0;
        a.target = null; a.wait = 1.7 + random() * 3.5; continue;
      }
      du /= distance; dv /= distance;
      const tx=a.u-TROUGH.u,ty=a.v-TROUGH.v,td=Math.hypot(tx,ty),ts=a.radius+TROUGH.radius+17;
      if(td>0&&td<ts){const force=(ts-td)/15;du+=tx/td*force;dv+=ty/td*force;}
      // Steering starts before contact; the projection below is the hard collision limit.
      for (const b of actors) {
        if (a === b || !b.active) continue;
        const x = a.u - b.u, y = a.v - b.v, d = Math.hypot(x, y), space = a.radius + b.radius + 15;
        if (d > 0 && d < space) { const force = (space - d) / 15; du += x / d * force; dv += y / d * force; }
      }
      const length = Math.hypot(du, dv);
      if (length > .01) {
        const response=1-Math.exp(-dt*5),speed=Math.min(distance*2,a.speed);
        a.vx+=(du/Math.max(1,length)*speed-a.vx)*response;
        a.vy+=(dv/Math.max(1,length)*speed-a.vy)*response;
        a.u+=a.vx*dt;a.v+=a.vy*dt;
      }
      bounded(a);
    }
    settle();
    for (const a of actors) {
      if (!a.active) continue;
      const du = a.u - before[a.id].u, dv = a.v - before[a.id].v, moved = Math.hypot(du, dv);
      a.moving = moved > dt * 2;
      a.distance += moved;
      if (Math.abs(du - dv) > dt*4 && time>a.turnAfter) {const face=du>dv?1:-1;if(face!==a.facing){a.facing=face;a.turnAfter=time+.7;}}
      a.blocked = a.target && moved < dt * 3 ? a.blocked + dt : 0;
      if (a.blocked > 1.3) { a.target = null; a.wait = .4 + random(); a.blocked = 0; }
    }
  }
  settle();
  const positions = () => actors.map(a => ({ ...a, ...project(a.u, a.v), eating: a.eatUntil > time }));
  return { step, gather, positions, sync };
}
