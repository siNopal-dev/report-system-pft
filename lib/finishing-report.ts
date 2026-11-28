export type Group = {name:string; cols:string[]; type:'input'|'subtotal'};
export type Definition = {id:string;title:string;unit:string;note:string;groups:Group[]};
export const definitions:Definition[] = [
 {id:'bakar',title:'BAKAR BULU',unit:'KODI',note:'TOTAL = SARUNG + KAIN GREY.',groups:[{name:'MESIN BARU',cols:['SARUNG','KAIN GREY'],type:'input'}]},
 {id:'washing',title:'WASHING',unit:'KODI',note:'SUB TOTAL PER PROSES = XIAN LIAN + PANON + HASPEL. TOTAL = JUMLAH SELURUH SUB TOTAL.',groups:[...['XIAN LIAN','PANON','HASPEL'].map(name=>({name,cols:['WASHING','DESIZING','PRESET','REPROSES'],type:'input' as const})),{name:'SUB TOTAL',cols:['WASHING','DESIZING','PRESET','REPROSES'],type:'subtotal'}]},
 {id:'kalender',title:'KALENDER',unit:'KODI',note:'SUB TOTAL PER PROSES = SANDO + WAKAYAMA + RAMISH. TOTAL = KALENDER + REPROSES.',groups:[...['SANDO','WAKAYAMA','RAMISH'].map(name=>({name,cols:['KALENDER','REPROSES'],type:'input' as const})),{name:'SUB TOTAL',cols:['KALENDER','REPROSES'],type:'subtotal'}]},
 {id:'stenter',title:'STENTER',unit:'TOTAL PROSES',note:'TOTAL = PENJUMLAHAN SELURUH PROSES PADA MIKWANG 1, MIKWANG 2, DAN YAMUNA. EJAAN REPOSES SESUAI FORMAT SUMBER.',groups:[{name:'MIKWANG 1',cols:['FINISH SRG','PRESET SRG','FINISH KAIN','PRESET KAIN','PENGERING','REPROSES'],type:'input'},{name:'MIKWANG 2',cols:['FINISH SRG','PRESET SRG','FINISH KAIN','PRESET KAIN','DRYER','REPROSES'],type:'input'},{name:'YAMUNA',cols:['FINISH SRG','PRESET SRG','FINISH KAIN','PRESET KAIN','PENGERING','REPOSES'],type:'input'}]}
];
export const fieldKey=(group:string,index:number,col:string)=>`${group}__${index}__${col}`;
export const inputKeys=(def:Definition)=>def.groups.filter(g=>g.type==='input').flatMap(g=>g.cols.map((c,i)=>fieldKey(g.name,i,c)));
export function calculate(def:Definition,record:Record<string,number>){
 const calculated:Record<string,number>={};
 for(const group of def.groups.filter(g=>g.type==='subtotal'))group.cols.forEach((col,i)=>{
  calculated[fieldKey(group.name,i,col)]=def.groups.filter(g=>g.type==='input').reduce((sum,g)=>sum+(record[fieldKey(g.name,i,col)]||0),0);
 });
 calculated.TOTAL=def.groups.filter(g=>g.type==='input').flatMap(g=>g.cols.map((col,i)=>record[fieldKey(g.name,i,col)]||0)).reduce((a,b)=>a+b,0);
 return calculated;
}
