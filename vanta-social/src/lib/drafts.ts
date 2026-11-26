export type Draft = {caption:string;location:string;sound:string;files:File[]};
async function access(key:string, mode:IDBTransactionMode, action:(s:IDBObjectStore)=>IDBRequest):Promise<any>{
 const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('vanta-drafts',1);r.onupgradeneeded=()=>r.result.createObjectStore('drafts');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 try{return await new Promise((resolve,reject)=>{const tx=db.transaction('drafts',mode);const r=action(tx.objectStore('drafts'));tx.oncomplete=()=>resolve(r.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}finally{db.close();}
}
export const saveDraft=(key:string,d:Draft)=>access(key,'readwrite',s=>s.put(d,key));
export const loadDraft=(key:string):Promise<Draft|undefined>=>access(key,'readonly',s=>s.get(key));
export const deleteDraft=(key:string)=>access(key,'readwrite',s=>s.delete(key));
