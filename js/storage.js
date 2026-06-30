/* ===========================================================
   AMOX — storage.js
   Capa única de persistencia (IndexedDB).
   Toda lectura/escritura de documentos pasa por aquí.
   Nadie más debe tocar IndexedDB directamente.
=========================================================== */

const AmoxStorage = (() => {

  const DB_NAME = "amox_db";
  const DB_VERSION = 2;
  const STORE_DOCS = "documents";
  const STORE_META = "meta";

  const FREE_DOC_LIMIT = 15;
  const TRASH_RETENTION_DAYS = 30;

  let dbPromise = null;

  /* ---------- Conexión ---------- */

  function openDB(){
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        const tx = e.target.transaction;

        let store;
        if (!db.objectStoreNames.contains(STORE_DOCS)){
          store = db.createObjectStore(STORE_DOCS, { keyPath:"id" });
          store.createIndex("category", "category", { unique:false });
          store.createIndex("createdAt", "createdAt", { unique:false });
        }else{
          store = tx.objectStore(STORE_DOCS);
        }

        if (!store.indexNames.contains("deletedAt")){
          store.createIndex("deletedAt", "deletedAt", { unique:false });
        }

        if (!db.objectStoreNames.contains(STORE_META)){
          db.createObjectStore(STORE_META, { keyPath:"key" });
        }
      };

      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = (e) => reject(e.target.error);
    });

    return dbPromise;
  }

  function tx(storeName, mode){
    return openDB().then(db => db.transaction(storeName, mode).objectStore(storeName));
  }

  /* ---------- Plan del usuario (Free / Premium) ----------
     v0.2.0 no tiene backend todavía, así que el plan se guarda
     localmente. Cuando llegue v0.8.0 (Nube), esto se sustituye
     por el valor real de la cuenta del usuario sin tocar el
     resto de la app, porque todo pasa por isPremium().
  ------------------------------------------------------------ */

  async function isPremium(){
    const store = await tx(STORE_META, "readonly");
    return new Promise((resolve) => {
      const req = store.get("plan");
      req.onsuccess = () => resolve(req.result?.value === "premium");
      req.onerror = () => resolve(false);
    });
  }

  async function setPremium(value){
    const store = await tx(STORE_META, "readwrite");
    return new Promise((resolve, reject) => {
      const req = store.put({ key:"plan", value: value ? "premium" : "free" });
      req.onsuccess = () => resolve(true);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  /* ---------- Documentos activos (no en papelera) ---------- */

  async function countDocuments(){
    const all = await getAllDocuments();
    return all.length;
  }

  async function canAddDocument(){
    const premium = await isPremium();
    if (premium) return { allowed:true };

    const count = await countDocuments();
    if (count >= FREE_DOC_LIMIT){
      return { allowed:false, reason:"limit", limit:FREE_DOC_LIMIT, count };
    }
    return { allowed:true, count, limit:FREE_DOC_LIMIT };
  }

  /**
   * doc = {
   *   name, category, imageBlob, createdAt, favorite, deletedAt
   * }
   */
  async function addDocument(doc){
    const check = await canAddDocument();
    if (!check.allowed){
      const err = new Error("DOC_LIMIT_REACHED");
      err.code = "DOC_LIMIT_REACHED";
      err.limit = check.limit;
      throw err;
    }

    const record = {
      id: "doc_" + Date.now() + "_" + Math.random().toString(36).slice(2,8),
      name: doc.name || "Documento sin nombre",
      category: doc.category || "otros",
      imageBlob: doc.imageBlob,
      createdAt: Date.now(),
      favorite: false,
      deletedAt: null
    };

    const store = await tx(STORE_DOCS, "readwrite");
    return new Promise((resolve, reject) => {
      const req = store.add(record);
      req.onsuccess = () => resolve(record);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async function getAllRaw(){
    const store = await tx(STORE_DOCS, "readonly");
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Documentos activos (fuera de la papelera), opcionalmente
   * filtrados por categoría y ordenados.
   * sortBy: "recent" (default) | "oldest" | "name"
   */
  async function getAllDocuments({ category = null, sortBy = "recent" } = {}){
    const all = await getAllRaw();
    let docs = all.filter(d => !d.deletedAt);

    if (category){
      docs = docs.filter(d => d.category === category);
    }

    docs = sortDocs(docs, sortBy);
    return docs;
  }

  function sortDocs(docs, sortBy){
    switch (sortBy){
      case "oldest":
        return docs.sort((a,b) => a.createdAt - b.createdAt);
      case "name":
        return docs.sort((a,b) => a.name.localeCompare(b.name, "es"));
      case "recent":
      default:
        return docs.sort((a,b) => b.createdAt - a.createdAt);
    }
  }

  async function getRecentDocuments(limit = 3){
    const all = await getAllDocuments();
    return all.slice(0, limit);
  }

  async function getFavoriteDocuments(){
    const all = await getAllDocuments();
    return all.filter(d => d.favorite);
  }

  async function getDocument(id){
    const store = await tx(STORE_DOCS, "readonly");
    return new Promise((resolve, reject) => {
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async function updateDocument(id, changes){
    const store = await tx(STORE_DOCS, "readwrite");
    return new Promise((resolve, reject) => {
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const doc = getReq.result;
        if (!doc){ resolve(null); return; }
        const updated = { ...doc, ...changes };
        const putReq = store.put(updated);
        putReq.onsuccess = () => resolve(updated);
        putReq.onerror = (e) => reject(e.target.error);
      };
      getReq.onerror = (e) => reject(e.target.error);
    });
  }

  async function toggleFavorite(id){
    const doc = await getDocument(id);
    if (!doc) return null;
    return updateDocument(id, { favorite: !doc.favorite });
  }

  /* ---------- Papelera (retención de 30 días) ----------
     Borrar un documento nunca es destructivo de inmediato:
     se marca deletedAt y se excluye de las vistas normales.
     purgeExpiredTrash() limpia lo que ya cumplió el plazo.
  ------------------------------------------------------------ */

  async function softDeleteDocument(id){
    return updateDocument(id, { deletedAt: Date.now() });
  }

  async function restoreDocument(id){
    return updateDocument(id, { deletedAt: null });
  }

  async function permanentlyDeleteDocument(id){
    const store = await tx(STORE_DOCS, "readwrite");
    return new Promise((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async function getTrashedDocuments(){
    const all = await getAllRaw();
    const trashed = all.filter(d => d.deletedAt);
    trashed.sort((a,b) => b.deletedAt - a.deletedAt);
    return trashed.map(d => ({
      ...d,
      daysRemaining: Math.max(0, TRASH_RETENTION_DAYS - daysSince(d.deletedAt))
    }));
  }

  function daysSince(timestamp){
    return Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24));
  }

  /**
   * Borra definitivamente lo que lleva más de 30 días en papelera.
   * Se ejecuta una vez al iniciar la app (ver app.js).
   */
  async function purgeExpiredTrash(){
    const all = await getAllRaw();
    const expired = all.filter(d => d.deletedAt && daysSince(d.deletedAt) >= TRASH_RETENTION_DAYS);

    for (const doc of expired){
      await permanentlyDeleteDocument(doc.id);
    }
    return expired.length;
  }

  /* ---------- Compatibilidad: deleteDocument ahora es soft-delete ----------
     Cualquier código existente que llame deleteDocument() pasa a usar
     la papelera automáticamente, sin tener que tocar app.js por completo.
  ------------------------------------------------------------ */
  async function deleteDocument(id){
    return softDeleteDocument(id);
  }

  async function getStats(){
    const all = await getAllDocuments();
    const categories = new Set(all.map(d => d.category));
    return {
      total: all.length,
      categories: categories.size
    };
  }

  return {
    FREE_DOC_LIMIT,
    TRASH_RETENTION_DAYS,
    isPremium,
    setPremium,
    canAddDocument,
    addDocument,
    getAllDocuments,
    getRecentDocuments,
    getFavoriteDocuments,
    getDocument,
    updateDocument,
    toggleFavorite,
    deleteDocument,
    softDeleteDocument,
    restoreDocument,
    permanentlyDeleteDocument,
    getTrashedDocuments,
    purgeExpiredTrash,
    getStats
  };

})();
