/* ===========================================================
   AMOX — app.js
   Arranque, navegación y orquestación entre pantallas.
   No contiene lógica de cámara (scanner.js) ni de datos (storage.js).
=========================================================== */

const AmoxApp = (() => {

  const CATEGORY_LABELS = {
    identidad:"Identidad",
    finanzas:"Finanzas",
    salud:"Salud",
    vehiculos:"Vehículos",
    hogar:"Hogar",
    otros:"Otros"
  };

  const CATEGORY_ICONS = {
    identidad:"🪪",
    finanzas:"💳",
    salud:"🏥",
    vehiculos:"🚗",
    hogar:"🏠",
    otros:"📄"
  };

  let pendingBlob = null; // imagen recortada esperando nombre/categoría
  let selectedCategory = "otros";

  // Estado de la lista del dashboard (filtro y orden)
  let activeFilter = null;     // { type:"category", value:"identidad" } | { type:"favorites" } | null
  let sortBy = "recent";       // "recent" | "oldest" | "name"

  const els = {};

  function cacheEls(){
    els.splash = document.getElementById("splash");
    els.app = document.getElementById("app");

    els.docsCounter = document.getElementById("docsCounter");
    els.foldersCounter = document.getElementById("foldersCounter");
    els.recentList = document.getElementById("recentList");
    els.listTitle = document.getElementById("listTitle");
    els.sortToggle = document.getElementById("sortToggle");
    els.activeFilterBar = document.getElementById("activeFilterBar");
    els.clearFilterBtn = document.getElementById("clearFilterBtn");
    els.categoryCards = document.querySelectorAll(".categories .card");
    els.quickFavorites = document.getElementById("quickFavorites");

    els.fab = document.getElementById("fabScan");
    els.quickScan = document.getElementById("quickScan");
    els.quickImport = document.getElementById("quickImport");
    els.heroScanBtn = document.getElementById("heroScanBtn");

    els.previewScreen = document.getElementById("screen-preview");
    els.previewImage = document.getElementById("previewImage");
    els.previewName = document.getElementById("previewName");
    els.previewCategoryChips = document.getElementById("previewCategoryChips");
    els.btnPreviewBack = document.getElementById("btnPreviewBack");
    els.btnPreviewSave = document.getElementById("btnPreviewSave");

    els.paywallOverlay = document.getElementById("paywallOverlay");
    els.btnPaywallClose = document.getElementById("btnPaywallClose");
    els.btnPaywallUpgrade = document.getElementById("btnPaywallUpgrade");

    els.trashScreen = document.getElementById("screen-trash");
    els.trashList = document.getElementById("trashList");
    els.navTrash = document.getElementById("navTrash");
    els.btnTrashBack = document.getElementById("btnTrashBack");

    els.toast = document.getElementById("toast");
  }

  /* ---------- Splash ---------- */

  function runSplash(){
    setTimeout(() => {
      els.splash.style.opacity = "0";
      setTimeout(() => {
        els.splash.style.display = "none";
        els.app.style.display = "block";
        refreshDashboard();
      }, 600);
    }, 1600);
  }

  /* ---------- Dashboard dinámico ---------- */

  async function refreshDashboard(){
    const stats = await AmoxStorage.getStats();
    els.docsCounter.textContent = stats.total;
    els.foldersCounter.textContent = stats.categories;

    await renderList();
  }

  async function renderList(){
    let docs;

    if (activeFilter?.type === "favorites"){
      docs = await AmoxStorage.getFavoriteDocuments();
      docs = sortLocally(docs, sortBy); // getFavoriteDocuments no acepta sortBy, se ordena aquí
      els.listTitle.textContent = "Favoritos";
      els.activeFilterBar.style.display = "block";
    }else if (activeFilter?.type === "category"){
      docs = await AmoxStorage.getAllDocuments({ category: activeFilter.value, sortBy });
      els.listTitle.textContent = CATEGORY_LABELS[activeFilter.value] || "Categoría";
      els.activeFilterBar.style.display = "block";
    }else{
      docs = await AmoxStorage.getAllDocuments({ sortBy });
      els.listTitle.textContent = "Recientes";
      els.activeFilterBar.style.display = "none";
    }

    renderRecent(docs);
    updateSortLabel();
  }

  function sortLocally(docs, sort){
    const copy = [...docs];
    if (sort === "name") return copy.sort((a,b) => a.name.localeCompare(b.name, "es"));
    if (sort === "oldest") return copy.sort((a,b) => a.createdAt - b.createdAt);
    return copy.sort((a,b) => b.createdAt - a.createdAt);
  }

  function updateSortLabel(){
    const labels = { recent:"Más recientes ↓", oldest:"Más antiguos ↓", name:"Nombre A-Z" };
    els.sortToggle.textContent = labels[sortBy];
  }

  function cycleSortBy(){
    const order = ["recent", "oldest", "name"];
    const idx = order.indexOf(sortBy);
    sortBy = order[(idx + 1) % order.length];
    renderList();
  }

  function setFilter(filter){
    activeFilter = filter;
    renderList();
  }

  function clearFilter(){
    activeFilter = null;
    renderList();
  }

  function renderRecent(docs){
    els.recentList.innerHTML = "";

    if (docs.length === 0){
      const message = activeFilter
        ? "No hay documentos en esta vista."
        : "Aún no tienes documentos.<br>Escanea el primero para comenzar tu códice.";
      els.recentList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📜</div>
          <p>${message}</p>
        </div>
      `;
      return;
    }

    docs.forEach(doc => {
      const url = URL.createObjectURL(doc.imageBlob);
      const card = document.createElement("article");
      card.className = "recent-card";
      card.innerHTML = `
        <div class="recent-icon"><img src="${url}" alt=""></div>
        <div class="recent-info">
          <h4>${escapeHTML(doc.name)}</h4>
          <p>${CATEGORY_LABELS[doc.category] || "Otros"}</p>
        </div>
        <button class="fav-toggle${doc.favorite ? " active" : ""}" data-id="${doc.id}" aria-label="Favorito">${doc.favorite ? "★" : "☆"}</button>
        <button class="recent-delete" data-id="${doc.id}" aria-label="Eliminar">🗑️</button>
      `;

      card.querySelector(".fav-toggle").addEventListener("click", async (e) => {
        e.stopPropagation();
        await AmoxStorage.toggleFavorite(doc.id);
        renderList();
      });

      card.querySelector(".recent-delete").addEventListener("click", async (e) => {
        e.stopPropagation();
        await AmoxStorage.softDeleteDocument(doc.id);
        showToast("Documento enviado a la papelera");
        refreshDashboard();
      });

      els.recentList.appendChild(card);
    });
  }

  function escapeHTML(str){
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  /* ---------- Flujo: iniciar escaneo ---------- */

  function launchScanner(){
    AmoxScanner.start(onCropFinished);
  }

  function launchGalleryDirect(){
    AmoxScanner.start(onCropFinished);
    // Pequeño delay para asegurar que el listener de galería ya esté listo
    setTimeout(() => AmoxScanner.openGallery(), 50);
  }

  async function onCropFinished(blob){
    const check = await AmoxStorage.canAddDocument();
    if (!check.allowed){
      openPaywall();
      return;
    }
    pendingBlob = blob;
    openPreview(blob);
  }

  /* ---------- Vista previa / guardar ---------- */

  function openPreview(blob){
    const url = URL.createObjectURL(blob);
    els.previewImage.src = url;
    els.previewName.value = "";
    selectedCategory = "otros";
    renderCategoryChips();
    els.previewScreen.classList.add("active");
  }

  function renderCategoryChips(){
    els.previewCategoryChips.innerHTML = "";
    Object.keys(CATEGORY_LABELS).forEach(key => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip" + (key === selectedCategory ? " active" : "");
      chip.textContent = `${CATEGORY_ICONS[key]} ${CATEGORY_LABELS[key]}`;
      chip.addEventListener("click", () => {
        selectedCategory = key;
        renderCategoryChips();
      });
      els.previewCategoryChips.appendChild(chip);
    });
  }

  function closePreview(){
    els.previewScreen.classList.remove("active");
    pendingBlob = null;
  }

  async function saveDocument(){
    if (!pendingBlob) return;

    const name = els.previewName.value.trim() || defaultNameFor(selectedCategory);

    try{
      await AmoxStorage.addDocument({
        name,
        category: selectedCategory,
        imageBlob: pendingBlob
      });
      closePreview();
      showToast("Documento guardado");
      refreshDashboard();
    }catch(err){
      if (err.code === "DOC_LIMIT_REACHED"){
        closePreview();
        openPaywall();
      }else{
        showToast("No se pudo guardar. Intenta de nuevo.");
      }
    }
  }

  function defaultNameFor(category){
    const names = {
      identidad:"Documento de identidad",
      finanzas:"Documento financiero",
      salud:"Documento de salud",
      vehiculos:"Documento de vehículo",
      hogar:"Documento del hogar",
      otros:"Documento"
    };
    return names[category] || "Documento";
  }

  /* ---------- Paywall ---------- */

  function openPaywall(){
    els.paywallOverlay.classList.add("active");
  }

  function closePaywall(){
    els.paywallOverlay.classList.remove("active");
  }

  /* ---------- Papelera ---------- */

  async function openTrash(){
    els.trashScreen.classList.add("active");
    await renderTrash();
  }

  function closeTrash(){
    els.trashScreen.classList.remove("active");
  }

  async function renderTrash(){
    const docs = await AmoxStorage.getTrashedDocuments();
    els.trashList.innerHTML = "";

    if (docs.length === 0){
      els.trashList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🗑️</div>
          <p>La papelera está vacía.</p>
        </div>
      `;
      return;
    }

    docs.forEach(doc => {
      const url = URL.createObjectURL(doc.imageBlob);
      const card = document.createElement("article");
      card.className = "trash-card";
      card.innerHTML = `
        <div class="recent-icon"><img src="${url}" alt=""></div>
        <div class="recent-info">
          <h4>${escapeHTML(doc.name)}</h4>
          <p>${CATEGORY_LABELS[doc.category] || "Otros"}</p>
          <div class="trash-days">Se elimina en ${doc.daysRemaining} día${doc.daysRemaining === 1 ? "" : "s"}</div>
        </div>
        <div class="trash-actions">
          <button class="restore" data-id="${doc.id}">Restaurar</button>
          <button class="delete-forever" data-id="${doc.id}">Eliminar</button>
        </div>
      `;

      card.querySelector(".restore").addEventListener("click", async () => {
        await AmoxStorage.restoreDocument(doc.id);
        showToast("Documento restaurado");
        renderTrash();
        refreshDashboard();
      });

      card.querySelector(".delete-forever").addEventListener("click", async () => {
        await AmoxStorage.permanentlyDeleteDocument(doc.id);
        showToast("Documento eliminado definitivamente");
        renderTrash();
      });

      els.trashList.appendChild(card);
    });
  }

  /* ---------- Toast ---------- */

  let toastTimer = null;

  function showToast(message){
    els.toast.textContent = message;
    els.toast.classList.add("active");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove("active"), 2200);
  }

  /* ---------- Navegación inferior ---------- */

  function bindBottomNav(){
    const items = document.querySelectorAll(".nav-item");
    items.forEach(item => {
      item.addEventListener("click", () => {
        items.forEach(i => i.classList.remove("active"));
        item.classList.add("active");
      });
    });
  }

  /* ---------- Eventos generales ---------- */

  function bindEvents(){
    els.fab.addEventListener("click", launchScanner);
    if (els.heroScanBtn) els.heroScanBtn.addEventListener("click", launchScanner);
    if (els.quickScan) els.quickScan.addEventListener("click", launchScanner);
    if (els.quickImport) els.quickImport.addEventListener("click", launchGalleryDirect);
    if (els.quickFavorites) els.quickFavorites.addEventListener("click", () => setFilter({ type:"favorites" }));

    els.categoryCards.forEach(card => {
      card.addEventListener("click", () => {
        const category = card.dataset.category;
        setFilter({ type:"category", value:category });
      });
    });

    els.sortToggle.addEventListener("click", cycleSortBy);
    els.clearFilterBtn.addEventListener("click", clearFilter);

    els.btnPreviewBack.addEventListener("click", closePreview);
    els.btnPreviewSave.addEventListener("click", saveDocument);

    els.btnPaywallClose.addEventListener("click", closePaywall);
    els.btnPaywallUpgrade.addEventListener("click", () => {
      // v1.1.0 conectará Stripe aquí. Por ahora, mensaje informativo.
      closePaywall();
      showToast("Premium disponible próximamente");
    });

    if (els.navTrash) els.navTrash.addEventListener("click", openTrash);
    els.btnTrashBack.addEventListener("click", closeTrash);

    bindBottomNav();
  }

  /* ---------- Init ---------- */

  function init(){
    cacheEls();
    bindEvents();
    AmoxScanner.init();
    AmoxStorage.purgeExpiredTrash(); // limpieza silenciosa de documentos con más de 30 días en papelera
    runSplash();
  }

  return { init };

})();

document.addEventListener("DOMContentLoaded", AmoxApp.init);
