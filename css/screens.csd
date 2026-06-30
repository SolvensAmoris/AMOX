/* ===========================================================
   AMOX — screens.css
   Estilos específicos de cada pantalla.
=========================================================== */

#app{
  padding:var(--sp-7);
}

/* ===== HERO (Dashboard) ===== */
.hero{
  background:linear-gradient(135deg, #18A67A, #0F7E67);
  padding:var(--sp-7);
  border-radius:var(--radius-lg);
  box-shadow:var(--shadow);
}

.hero h1{
  font-size:28px;
  margin-bottom:var(--sp-3);
}

.hero p{
  opacity:.9;
  line-height:1.6;
  margin-bottom:var(--sp-6);
}

.search-box{ margin:var(--sp-7) 0; }

.search-box input{
  width:100%;
  padding:18px;
  border-radius:var(--radius-sm);
  background:var(--surface);
  color:var(--text);
  font-size:16px;
}

.spacer-nav{ height:calc(110px + var(--safe-bottom)); }

/* ===========================================================
   PANTALLA: ESCÁNER (cámara)
=========================================================== */

#screen-scanner{
  position:fixed;
  inset:0;
  background:#000;
  z-index:1500;
  display:flex;
  flex-direction:column;
}

.scanner-video-wrap{
  position:relative;
  flex:1;
  overflow:hidden;
  background:#000;
}

#scannerVideo{
  width:100%;
  height:100%;
  object-fit:cover;
}

#scannerCanvasHidden{
  display:none;
}

.scanner-guide{
  position:absolute;
  inset:8% 6%;
  border:2px dashed rgba(245,241,232,.45);
  border-radius:var(--radius);
  pointer-events:none;
}

.scanner-top-bar{
  position:absolute;
  top:calc(var(--sp-5) + var(--safe-top));
  left:var(--sp-5);
  right:var(--sp-5);
  display:flex;
  justify-content:space-between;
  align-items:center;
  z-index:2;
}

.scanner-top-bar .icon-btn{
  background:rgba(0,0,0,.45);
  backdrop-filter:blur(10px);
}

.scanner-hint{
  position:absolute;
  bottom:140px;
  left:0;
  right:0;
  text-align:center;
  color:var(--text);
  font-size:13px;
  opacity:.8;
  z-index:2;
}

.scanner-controls{
  padding:var(--sp-6) var(--sp-6) calc(var(--sp-7) + var(--safe-bottom));
  display:flex;
  align-items:center;
  justify-content:space-between;
  background:#000;
}

.scanner-side-btn{
  width:52px;
  height:52px;
  border-radius:50%;
  background:rgba(255,255,255,.08);
  color:var(--text);
  font-size:22px;
  display:flex;
  align-items:center;
  justify-content:center;
}

.shutter-btn{
  width:76px;
  height:76px;
  border-radius:50%;
  background:var(--text);
  border:5px solid rgba(255,255,255,.25);
  transition:transform var(--fast) var(--ease);
}

.shutter-btn:active{ transform:scale(.9); }

.scanner-error{
  position:absolute;
  inset:0;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  text-align:center;
  padding:var(--sp-7);
  gap:var(--sp-4);
  color:var(--text2);
}

.scanner-error .icon-big{
  font-size:40px;
}

/* ===========================================================
   PANTALLA: RECORTE
=========================================================== */

#screen-crop{
  position:fixed;
  inset:0;
  background:#000;
  z-index:1600;
  display:flex;
  flex-direction:column;
}

.crop-top-bar{
  display:flex;
  justify-content:space-between;
  align-items:center;
  padding:calc(var(--sp-5) + var(--safe-top)) var(--sp-5) var(--sp-4);
}

.crop-top-bar span{
  font-size:14px;
  color:var(--text2);
}

.crop-stage{
  flex:1;
  position:relative;
  display:flex;
  align-items:center;
  justify-content:center;
  overflow:hidden;
  touch-action:none;
}

#cropImage{
  max-width:100%;
  max-height:100%;
  user-select:none;
  -webkit-user-drag:none;
}

#cropOverlay{
  position:absolute;
  inset:0;
  touch-action:none;
}

.crop-handle{
  position:absolute;
  width:26px;
  height:26px;
  margin:-13px;
  border-radius:50%;
  background:var(--primary);
  border:3px solid var(--text);
  box-shadow:0 2px 8px rgba(0,0,0,.4);
  touch-action:none;
}

.crop-controls{
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding:var(--sp-5) var(--sp-6) calc(var(--sp-7) + var(--safe-bottom));
  gap:var(--sp-4);
}

.crop-controls .btn{
  width:auto;
  flex:1;
}

/* ===========================================================
   PANTALLA: VISTA PREVIA / GUARDAR
=========================================================== */

#screen-preview{
  position:fixed;
  inset:0;
  background:var(--bg);
  z-index:1600;
  display:flex;
  flex-direction:column;
  overflow-y:auto;
}

.preview-top-bar{
  display:flex;
  justify-content:space-between;
  align-items:center;
  padding:calc(var(--sp-5) + var(--safe-top)) var(--sp-6) var(--sp-4);
}

.preview-image-wrap{
  margin:0 var(--sp-6);
  border-radius:var(--radius);
  overflow:hidden;
  background:var(--surface);
  max-height:42vh;
  display:flex;
  align-items:center;
  justify-content:center;
}

.preview-image-wrap img{
  width:100%;
  object-fit:contain;
}

.preview-form{
  padding:var(--sp-6);
  flex:1;
}

.preview-save-bar{
  padding:0 var(--sp-6) calc(var(--sp-6) + var(--safe-bottom));
}

#screen-trash{
  position:fixed;
  inset:0;
  background:var(--bg);
  z-index:1600;
  display:none;
  flex-direction:column;
  overflow-y:auto;
}

#screen-trash.active{ display:flex; }

.trash-card{
  display:flex;
  align-items:center;
  gap:var(--sp-4);
  background:var(--surface);
  padding:var(--sp-4);
  border-radius:var(--radius);
  margin-bottom:var(--sp-3);
}

.trash-card .recent-icon{ opacity:.7; }

.trash-card .trash-days{
  font-size:12px;
  color:var(--warning);
  margin-top:var(--sp-1);
}

.trash-actions{
  display:flex;
  flex-direction:column;
  gap:var(--sp-2);
  flex-shrink:0;
}

.trash-actions button{
  font-size:12px;
  padding:8px 12px;
  border-radius:var(--radius-sm);
  background:var(--surface2);
  color:var(--text2);
}

.trash-actions button.restore{
  background:var(--primary-soft);
  color:var(--primary);
}

#activeFilterBar{
  margin-bottom:var(--sp-4);
}

.fav-toggle{
  background:none;
  font-size:18px;
  padding:var(--sp-2);
  flex-shrink:0;
  color:var(--text3);
}

.fav-toggle.active{
  color:var(--accent);
}

/* ===========================================================
   RESPONSIVE — pantallas grandes (tablet)
=========================================================== */

@media (min-width:600px){
  #app{
    max-width:560px;
    margin:0 auto;
  }

  .bottom-nav, .fab{
    max-width:560px;
    left:50%;
    transform:translateX(-50%);
  }

  .fab{
    right:calc(50% - 280px + 24px);
  }
}
