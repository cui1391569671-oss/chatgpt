import test from 'node:test';
import assert from 'node:assert/strict';
import {findMovieCovers} from '../game-covers.mjs';
test('movie picker returns film posters and years without selecting unrelated or landscape artwork',async()=>{
 const r=await findMovieCovers('Example',async()=>Response.json({query:{pages:[
  {title:'Example (1990 film)',extract:'A 1990 film.',thumbnail:{source:'https://upload.wikimedia.org/a.jpg',width:400,height:600}},
  {title:'Example (2020 film)',extract:'A 2020 film.',thumbnail:{source:'https://upload.wikimedia.org/b.jpg',width:400,height:600}},
  {title:'Example musician',extract:'A singer.',thumbnail:{source:'https://upload.wikimedia.org/c.jpg'}},
  {title:'Example film',extract:'It is a film.',thumbnail:{source:'https://upload.wikimedia.org/d.jpg',width:600,height:400}}
 ]}}));assert.equal(r.coverUrl,'');assert.deepEqual(r.candidates.map(x=>x.date),['1990','2020']);
});
test('movie lookup failure is distinct from empty results',async()=>{assert.equal((await findMovieCovers('x',async()=>{throw Error();})).reason,'unavailable');assert.equal((await findMovieCovers('x',async()=>Response.json({query:{pages:[]}}))).reason,'not_found');});
