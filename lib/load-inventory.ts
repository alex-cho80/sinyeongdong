import {database} from './store';
import {buildInventory} from './unit-inventory';
export async function loadInventory(){const db=database();const [l,c,h]=await Promise.all([db.prepare('SELECT * FROM lookups').all(),db.prepare('SELECT * FROM unit_lookups').all(),db.prepare('SELECT * FROM households').all()]);return buildInventory(l.results.map((r:any)=>({parcel:r.parcel,...JSON.parse(r.payload)})),c.results.map((r:any)=>JSON.parse(r.payload)),h.results);}
