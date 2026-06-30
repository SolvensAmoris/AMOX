/* ===========================================================
   AMOX — scanner.js
   Cámara, importar de galería, recorte (arrastre de esquinas)
   y rotación. Entrega un Blob final a quien lo invoque.
=========================================================== */

const AmoxScanner = (() => {

  let stream = null;
  let capturedImageURL = null;   // imagen cruda antes de recortar
  let rotationDeg = 0;

  // Estado del recorte (coordenadas en % relativas a la imagen mostrada)
  let cropPoints = null; // { tl:{x,y}, tr:{x,y}, br:{x,y}, bl:{x,y} }
  let activeHandle = null;
  let onFinishCallback = null;

  const els = {};

  function cacheEls(){
    els.scannerScreen = document.getElementById("screen-scanner");
    els.video = document.getElementById("scannerVideo");
    els.hiddenCanvas = document.getElementById("scannerCanvasHidden");
    els.scannerError = document.getElementById("scannerError");
    els.btnShutter = document.getElementById("btnShutter");
    els.btnCloseScanner = document.getElementById("btnCloseScanner");
    els.btnImportGallery = document.getElementById("btnImportGallery");
    els.btnImportGalleryFallback = document.getElementById("btnImportGalleryFallback");
    els.galleryInput = document.getElementById("galleryInput");

    els.cropScreen = document.getElementById("screen-crop");
    els.cropImage = document.getElementById("cropImage");
    els.cropOverlay = document.getElementById("cropOverlay");
    els.btnCropCancel = document.getElementById("btnCropCancel");
    els.btnCropRotate = document.getElementById("btnCropRotate");
    els.btnCropConfirm = document.getElementById("btnCropConfirm");
  }

  /* ---------- Apertura del flujo ---------- */

  function start(onFinish){
    onFinishCallback = onFinish;
    cacheEls();
    openScanner();
  }

  async function openScanner(){
    els.scannerScreen.classList.add("active");
    els.scannerError.style.display = "none";
    els.video.style.display = "block";

    try{
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode:"environment", width:{ ideal:1920 }, height:{ ideal:1080 } },
        audio:false
      });
      els.video.srcObject = stream;
      await els.video.play();
    }catch(err){
      showScannerError();
    }
  }

  function showScannerError(){
    els.video.style.display = "none";
    els.scannerError.style.display = "flex";
  }

  function stopCamera(){
    if (stream){
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
  }

  function closeScanner(){
    stopCamera();
    els.scannerScreen.classList.remove("active");
  }

  /* ---------- Captura desde cámara ---------- */

  function capturePhoto(){
    const video = els.video;
    const canvas = els.hiddenCanvas;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      stopCamera();
      els.scannerScreen.classList.remove("active");
      loadIntoCropper(URL.createObjectURL(blob));
    }, "image/jpeg", 0.92);
  }

  /* ---------- Importar desde galería ---------- */

  function openGallery(){
    els.galleryInput.click();
  }

  function handleGalleryFile(e){
    const file = e.target.files[0];
    if (!file) return;
    stopCamera();
    els.scannerScreen.classList.remove("active");
    loadIntoCropper(URL.createObjectURL(file));
    e.target.value = "";
  }

  /* ---------- Pantalla de recorte ---------- */

  function loadIntoCropper(url){
    capturedImageURL = url;
    rotationDeg = 0;
    els.cropImage.src = url;
    els.cropScreen.classList.add("active");

    els.cropImage.onload = () => {
      resetCropPoints();
      drawCropOverlay();
    };
  }

  function resetCropPoints(){
    // Recorte inicial: 8% de margen sobre la imagen
    cropPoints = {
      tl:{ x:8,  y:8  },
      tr:{ x:92, y:8  },
      br:{ x:92, y:92 },
      bl:{ x:8,  y:92 }
    };
  }

  function rotateImage(){
    rotationDeg = (rotationDeg + 90) % 360;
    els.cropImage.style.transform = `rotate(${rotationDeg}deg)`;
    resetCropPoints();
    drawCropOverlay();
  }

  function drawCropOverlay(){
    const overlay = els.cropOverlay;
    overlay.innerHTML = "";

    const rect = els.cropImage.getBoundingClientRect();
    const wrapRect = overlay.getBoundingClientRect();

    // Línea conectando los 4 puntos (SVG simple)
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.style.position = "absolute";
    svg.style.inset = "0";
    svg.style.pointerEvents = "none";

    const poly = document.createElementNS(svgNS, "polygon");
    const pointsAttr = ["tl","tr","br","bl"].map(k => {
      const p = toPixels(cropPoints[k], rect, wrapRect);
      return `${p.x},${p.y}`;
    }).join(" ");
    poly.setAttribute("points", pointsAttr);
    poly.setAttribute("fill", "rgba(24,166,122,.18)");
    poly.setAttribute("stroke", "#18A67A");
    poly.setAttribute("stroke-width", "2");
    svg.appendChild(poly);
    overlay.appendChild(svg);

    // Handles arrastrables
    Object.keys(cropPoints).forEach(key => {
      const handle = document.createElement("div");
      handle.className = "crop-handle";
      handle.dataset.handle = key;
      const p = toPixels(cropPoints[key], rect, wrapRect);
      handle.style.left = p.x + "px";
      handle.style.top = p.y + "px";

      handle.addEventListener("pointerdown", onHandleDown);
      overlay.appendChild(handle);
    });
  }

  function toPixels(point, imgRect, wrapRect){
    const offsetX = imgRect.left - wrapRect.left;
    const offsetY = imgRect.top - wrapRect.top;
    return {
      x: offsetX + (point.x / 100) * imgRect.width,
      y: offsetY + (point.y / 100) * imgRect.height
    };
  }

  function toPercent(clientX, clientY, imgRect){
    let x = ((clientX - imgRect.left) / imgRect.width) * 100;
    let y = ((clientY - imgRect.top) / imgRect.height) * 100;
    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(100, y));
    return { x, y };
  }

  function onHandleDown(e){
    e.preventDefault();
    activeHandle = e.target.dataset.handle;
    window.addEventListener("pointermove", onHandleMove);
    window.addEventListener("pointerup", onHandleUp);
  }

  function onHandleMove(e){
    if (!activeHandle) return;
    const imgRect = els.cropImage.getBoundingClientRect();
    cropPoints[activeHandle] = toPercent(e.clientX, e.clientY, imgRect);
    drawCropOverlay();
  }

  function onHandleUp(){
    activeHandle = null;
    window.removeEventListener("pointermove", onHandleMove);
    window.removeEventListener("pointerup", onHandleUp);
  }

  /* ---------- Confirmar recorte → genera Blob final ---------- */

  function confirmCrop(){
    const img = els.cropImage;

    // Para v0.2.0: recorte rectangular tomando la caja delimitadora
    // de los 4 puntos (cubre el caso de uso real: ajustar bordes).
    const xs = Object.values(cropPoints).map(p => p.x);
    const ys = Object.values(cropPoints).map(p => p.y);
    const minX = Math.min(...xs) / 100;
    const maxX = Math.max(...xs) / 100;
    const minY = Math.min(...ys) / 100;
    const maxY = Math.max(...ys) / 100;

    const naturalW = img.naturalWidth;
    const naturalH = img.naturalHeight;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const rotated = rotationDeg % 180 !== 0;
    const sourceW = rotated ? naturalH : naturalW;
    const sourceH = rotated ? naturalW : naturalH;

    const cropX = minX * sourceW;
    const cropY = minY * sourceH;
    const cropW = (maxX - minX) * sourceW;
    const cropH = (maxY - minY) * sourceH;

    canvas.width = cropW;
    canvas.height = cropH;

    // Dibujar la imagen completa rotada en un canvas temporal primero
    const fullCanvas = document.createElement("canvas");
    const fullCtx = fullCanvas.getContext("2d");
    fullCanvas.width = sourceW;
    fullCanvas.height = sourceH;

    fullCtx.save();
    fullCtx.translate(sourceW/2, sourceH/2);
    fullCtx.rotate((rotationDeg * Math.PI) / 180);
    fullCtx.drawImage(img, -naturalW/2, -naturalH/2, naturalW, naturalH);
    fullCtx.restore();

    ctx.drawImage(fullCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    canvas.toBlob((blob) => {
      els.cropScreen.classList.remove("active");
      if (onFinishCallback) onFinishCallback(blob);
    }, "image/jpeg", 0.92);
  }

  function cancelCrop(){
    els.cropScreen.classList.remove("active");
    if (capturedImageURL) URL.revokeObjectURL(capturedImageURL);
  }

  /* ---------- Eventos ---------- */

  function bindEvents(){
    els.btnShutter.addEventListener("click", capturePhoto);
    els.btnCloseScanner.addEventListener("click", closeScanner);
    els.btnImportGallery.addEventListener("click", openGallery);
    els.btnImportGalleryFallback.addEventListener("click", openGallery);
    els.galleryInput.addEventListener("change", handleGalleryFile);

    els.btnCropCancel.addEventListener("click", cancelCrop);
    document.getElementById("btnCropCancelBottom").addEventListener("click", cancelCrop);
    els.btnCropRotate.addEventListener("click", rotateImage);
    els.btnCropConfirm.addEventListener("click", confirmCrop);

    window.addEventListener("resize", () => {
      if (els.cropScreen.classList.contains("active")) drawCropOverlay();
    });
  }

  return {
    init(){ cacheEls(); bindEvents(); },
    start,
    openGallery
  };

})();
