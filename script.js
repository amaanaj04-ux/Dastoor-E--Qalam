const STORAGE_KEY = "dastoorEQalamProducts";
const PUBLISH_PENDING_KEY = "dastoorEQalamPublishPending";
const AUTH_SESSION_KEY = "dastoorEQalamAdminSession";
const ADMIN_EMAIL = "amaanaj04@gmail.com";
const CATALOGUE_FILE = "catalogue.json";

const sampleProducts = [
  {
    id: "sample-frame-1",
    name: "Ayat ul Kursi Wall Frame",
    category: "Frame",
    price: 1800,
    image:
      "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=900&q=60"
  },
  {
    id: "sample-keychain-1",
    name: "Personalised Name Keychain",
    category: "Keychain",
    price: 350,
    image:
      "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=900&q=60"
  },
  {
    id: "sample-bookmark-1",
    name: "Floral Calligraphy Bookmark Set",
    category: "Bookmark",
    price: 250,
    image:
      "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=900&q=60"
  }
];

const productGrid = document.getElementById("product-grid");
const productTemplate = document.getElementById("product-card-template");
const productForm = document.getElementById("product-form");
const toggleAdminBtn = document.getElementById("toggle-admin-btn");
const adminPanel = document.getElementById("admin-panel");
const adminSection = document.getElementById("admin-section");
const categoryFilters = document.getElementById("category-filters");
const emptyState = document.getElementById("empty-state");
const imageInput = document.getElementById("image");
const previewWrap = document.getElementById("preview-wrap");
const imagePreview = document.getElementById("image-preview");
const imageHint = document.getElementById("image-hint");
const exportBtn = document.getElementById("export-btn");
const importInput = document.getElementById("import-input");
const resetBtn = document.getElementById("reset-btn");
const yearEl = document.getElementById("year");
const editIdInput = document.getElementById("edit-id");
const formSubmitBtn = document.getElementById("form-submit-btn");
const cancelEditBtn = document.getElementById("cancel-edit-btn");
const adminSigninBtn = document.getElementById("admin-signin-btn");
const adminSignoutBtn = document.getElementById("admin-signout-btn");
const adminChip = document.getElementById("admin-chip");
const adminEmailDisplay = document.getElementById("admin-email-display");
const authDialog = document.getElementById("auth-dialog");
const authDialogClose = document.getElementById("auth-dialog-close");
const googleSigninContainer = document.getElementById("google-signin-container");
const setupNotice = document.getElementById("setup-notice");
const editDialog = document.getElementById("edit-dialog");
const quickEditForm = document.getElementById("quick-edit-form");
const quickEditId = document.getElementById("quick-edit-id");
const quickEditName = document.getElementById("quick-edit-name");
const quickEditPrice = document.getElementById("quick-edit-price");
const quickEditCancel = document.getElementById("quick-edit-cancel");
const publishBanner = document.getElementById("publish-banner");
const publishBtn = document.getElementById("publish-btn");
const publishBtnPanel = document.getElementById("publish-btn-panel");
const publishHeaderBtn = document.getElementById("publish-header-btn");
const publishDoneBtn = document.getElementById("publish-done-btn");

let products = [...sampleProducts];
let liveCatalogueSnapshot = "";
let activeCategory = "all";
let adminPanelOpen = false;
let isAdmin = false;
let googleInitialized = false;
let pendingLocalDraft = null;

const config = window.DASTOOR_CONFIG || {};
const googleClientId = (config.GOOGLE_CLIENT_ID || "").trim();

yearEl.textContent = new Date().getFullYear();

initApp();

async function initApp() {
  const fromServer = await fetchLiveCatalogue();
  if (fromServer.length > 0) {
    products = fromServer;
    liveCatalogueSnapshot = catalogueFingerprint(products);
  } else {
    products = [...sampleProducts];
    liveCatalogueSnapshot = catalogueFingerprint(sampleProducts);
  }

  pendingLocalDraft = loadLocalDraft();
  renderProducts();
  restoreAdminSession();
  initGoogleAuth();
  updatePublishBanner();
}

toggleAdminBtn.addEventListener("click", () => {
  if (!isAdmin) return;
  adminPanelOpen = !adminPanelOpen;
  adminPanel.classList.toggle("hidden", !adminPanelOpen);
  toggleAdminBtn.setAttribute("aria-expanded", String(adminPanelOpen));
  toggleAdminBtn.textContent = adminPanelOpen ? "Close panel" : "Add product";
});

categoryFilters.addEventListener("click", (event) => {
  const button = event.target.closest(".filter-btn");
  if (!button) return;

  activeCategory = button.dataset.category;
  categoryFilters.querySelectorAll(".filter-btn").forEach((btn) => {
    const isActive = btn === button;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-selected", String(isActive));
  });
  renderProducts();
});

imageInput.addEventListener("change", () => {
  const file = imageInput.files[0];
  if (!file) {
    previewWrap.classList.add("hidden");
    return;
  }
  imagePreview.src = URL.createObjectURL(file);
  previewWrap.classList.remove("hidden");
});

productForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!isAdmin) return;

  const nameInput = document.getElementById("name");
  const categoryInput = document.getElementById("category");
  const priceInput = document.getElementById("price");
  const file = imageInput.files[0];
  const editId = editIdInput.value;
  const label = nameInput.value.trim();
  const category = categoryInput.value;
  const price = Number(priceInput.value);

  if (editId) {
    const index = products.findIndex((p) => p.id === editId);
    if (index === -1) return;

    const updated = {
      ...products[index],
      name: label,
      category,
      price
    };

    if (file) {
      updated.image = await fileToDataUrl(file);
    }

    products[index] = updated;
    saveProducts();
    renderProducts();
    resetProductForm();
    return;
  }

  if (!file) {
    alert("Please select a photograph for a new product.");
    return;
  }

  const imageDataUrl = await fileToDataUrl(file);

  products.unshift({
    id: crypto.randomUUID(),
    name: label,
    category,
    price,
    image: imageDataUrl
  });

  saveProducts();
  renderProducts();
  resetProductForm();
});

cancelEditBtn.addEventListener("click", resetProductForm);

exportBtn.addEventListener("click", () => {
  if (!isAdmin) return;
  downloadCatalogueFile("dastoor-e-qalam-backup.json");
});

for (const btn of [publishBtn, publishBtnPanel, publishHeaderBtn]) {
  btn?.addEventListener("click", publishToWebsite);
}

publishDoneBtn?.addEventListener("click", () => {
  localStorage.removeItem(PUBLISH_PENDING_KEY);
  updatePublishBanner();
});

importInput.addEventListener("change", async (event) => {
  if (!isAdmin) return;
  const file = event.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) throw new Error("Invalid format");
    products = parsed.filter(isValidProduct);
    saveProducts();
    renderProducts();
    alert("Backup imported. Click Publish to website so everyone can see these products.");
  } catch (error) {
    alert("Could not import file. Please use a valid JSON backup.");
    console.error(error);
  }
  importInput.value = "";
});

resetBtn.addEventListener("click", () => {
  if (!isAdmin) return;
  if (!confirm("Reset catalogue to sample products? You must Publish to website for visitors to see the change.")) {
    return;
  }
  products = [...sampleProducts];
  saveProducts();
  renderProducts();
});

adminSigninBtn.addEventListener("click", () => {
  if (!googleClientId) {
    setupNotice.classList.remove("hidden");
    setupNotice.scrollIntoView({ behavior: "smooth" });
    return;
  }
  authDialog.showModal();
  renderGoogleButton();
});

adminSignoutBtn.addEventListener("click", signOutAdmin);

authDialogClose.addEventListener("click", () => authDialog.close());

authDialog.addEventListener("click", (event) => {
  if (event.target === authDialog) authDialog.close();
});

quickEditForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!isAdmin) return;

  const id = quickEditId.value;
  const index = products.findIndex((p) => p.id === id);
  if (index === -1) return;

  products[index] = {
    ...products[index],
    name: quickEditName.value.trim(),
    price: Number(quickEditPrice.value)
  };

  saveProducts();
  renderProducts();
  editDialog.close();
});

quickEditCancel.addEventListener("click", () => editDialog.close());

editDialog.addEventListener("click", (event) => {
  if (event.target === editDialog) editDialog.close();
});

window.handleGoogleCredential = function handleGoogleCredential(response) {
  try {
    const payload = parseJwt(response.credential);
    const email = (payload.email || "").toLowerCase();

    if (email !== ADMIN_EMAIL) {
      alert(
        "Access denied. Only the authorised owner account can edit this catalogue."
      );
      if (window.google?.accounts?.id) {
        google.accounts.id.disableAutoSelect();
      }
      return;
    }

    const session = {
      email: payload.email,
      name: payload.name || "",
      picture: payload.picture || "",
      exp: payload.exp
    };

    sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
    setAdminState(true, session);
    authDialog.close();
  } catch (error) {
    console.error("Sign-in failed:", error);
    alert("Could not verify sign-in. Please try again.");
  }
};

function initGoogleAuth() {
  if (!googleClientId) {
    setupNotice.classList.remove("hidden");
    adminSigninBtn.hidden = false;
    adminSigninBtn.textContent = "Owner setup";
    return;
  }

  adminSigninBtn.hidden = false;
  adminSigninBtn.textContent = "Owner sign in";

  const tryInit = () => {
    if (!window.google?.accounts?.id || googleInitialized) return;
    google.accounts.id.initialize({
      client_id: googleClientId,
      callback: handleGoogleCredential,
      auto_select: false,
      cancel_on_tap_outside: true
    });
    googleInitialized = true;
    renderGoogleButton();
  };

  if (window.google?.accounts?.id) {
    tryInit();
  } else {
    window.addEventListener("load", tryInit);
    const interval = setInterval(() => {
      if (window.google?.accounts?.id) {
        tryInit();
        clearInterval(interval);
      }
    }, 200);
    setTimeout(() => clearInterval(interval), 10000);
  }
}

function renderGoogleButton() {
  if (!googleClientId || !window.google?.accounts?.id) return;
  googleSigninContainer.innerHTML = "";
  google.accounts.id.renderButton(googleSigninContainer, {
    type: "standard",
    theme: "outline",
    size: "large",
    text: "signin_with",
    shape: "rectangular",
    width: 280
  });
}

function restoreAdminSession() {
  try {
    const raw = sessionStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) {
      setAdminState(false);
      return;
    }
    const session = JSON.parse(raw);
    if (!session.exp || session.exp * 1000 < Date.now()) {
      sessionStorage.removeItem(AUTH_SESSION_KEY);
      setAdminState(false);
      return;
    }
    if ((session.email || "").toLowerCase() !== ADMIN_EMAIL) {
      sessionStorage.removeItem(AUTH_SESSION_KEY);
      setAdminState(false);
      return;
    }
    setAdminState(true, session);
  } catch {
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    setAdminState(false);
  }
}

function setAdminState(admin, session = null) {
  isAdmin = admin;
  document.body.classList.toggle("is-admin", admin);

  adminSection.classList.toggle("hidden", !admin);
  setupNotice.classList.add("hidden");

  adminSigninBtn.classList.toggle("hidden", admin);
  adminChip.classList.toggle("hidden", !admin);

  if (admin && session) {
    adminEmailDisplay.textContent = session.email;
    offerLocalDraftRecovery();
  }

  if (!admin) {
    adminPanelOpen = false;
    adminPanel.classList.add("hidden");
    toggleAdminBtn.setAttribute("aria-expanded", "false");
    toggleAdminBtn.textContent = "Add product";
    resetProductForm();
  }

  renderProducts();
  updatePublishBanner();
}

function offerLocalDraftRecovery() {
  if (!pendingLocalDraft || pendingLocalDraft.length === 0) return;
  if (catalogueFingerprint(pendingLocalDraft) === catalogueFingerprint(products)) {
    pendingLocalDraft = null;
    return;
  }

  const useDraft = confirm(
    "This browser has products you added earlier that are not on the live website yet.\n\n" +
      "Click OK to load them so you can Publish to website.\n" +
      "Click Cancel to keep showing the live catalogue."
  );

  if (useDraft) {
    products = pendingLocalDraft;
    saveProducts();
    renderProducts();
  }

  pendingLocalDraft = null;
}

function signOutAdmin() {
  sessionStorage.removeItem(AUTH_SESSION_KEY);
  if (window.google?.accounts?.id) {
    google.accounts.id.disableAutoSelect();
  }
  setAdminState(false);
}

function parseJwt(token) {
  const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  const json = decodeURIComponent(
    atob(base64)
      .split("")
      .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
      .join("")
  );
  return JSON.parse(json);
}

function resetProductForm() {
  productForm.reset();
  editIdInput.value = "";
  formSubmitBtn.textContent = "Add to catalogue";
  cancelEditBtn.classList.add("hidden");
  imageInput.required = true;
  imageHint.textContent =
    "Required for new products. Leave empty when only editing label or price.";
  previewWrap.classList.add("hidden");
}

function startEditProduct(product) {
  if (!isAdmin) return;
  editIdInput.value = product.id;
  document.getElementById("name").value = product.name;
  document.getElementById("category").value = product.category;
  document.getElementById("price").value = product.price;
  imageInput.required = false;
  imageHint.textContent = "Optional — upload only if you want to replace the photo.";
  formSubmitBtn.textContent = "Save changes";
  cancelEditBtn.classList.remove("hidden");
  adminPanelOpen = true;
  adminPanel.classList.remove("hidden");
  toggleAdminBtn.setAttribute("aria-expanded", "true");
  toggleAdminBtn.textContent = "Close panel";
  adminSection.scrollIntoView({ behavior: "smooth" });
}

function openQuickEdit(product) {
  if (!isAdmin) return;
  quickEditId.value = product.id;
  quickEditName.value = product.name;
  quickEditPrice.value = product.price;
  editDialog.showModal();
}

function isValidProduct(item) {
  return (
    item &&
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    ["Frame", "Keychain", "Bookmark"].includes(item.category) &&
    typeof item.price === "number" &&
    typeof item.image === "string"
  );
}

async function fetchLiveCatalogue() {
  try {
    const res = await fetch(`${CATALOGUE_FILE}?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return [];
    const parsed = await res.json();
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidProduct);
  } catch (error) {
    console.warn("Could not load live catalogue:", error);
    return [];
  }
}

function loadLocalDraft() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed.filter(isValidProduct);
  } catch {
    return null;
  }
}

function saveProducts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  if (isAdmin && catalogueFingerprint(products) !== liveCatalogueSnapshot) {
    localStorage.setItem(PUBLISH_PENDING_KEY, "1");
  }
  updatePublishBanner();
}

function catalogueFingerprint(list) {
  return JSON.stringify(
    list.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      price: p.price,
      image: p.image
    }))
  );
}

function needsPublish() {
  if (!isAdmin) return false;
  if (localStorage.getItem(PUBLISH_PENDING_KEY) === "1") return true;
  return catalogueFingerprint(products) !== liveCatalogueSnapshot;
}

function updatePublishBanner() {
  const show = isAdmin && needsPublish();
  publishBanner?.classList.toggle("hidden", !show);
  publishHeaderBtn?.classList.toggle("hidden", !isAdmin);
}

function publishToWebsite() {
  if (!isAdmin) return;
  downloadCatalogueFile(CATALOGUE_FILE);
  alert(
    "Step 1: A file named catalogue.json was downloaded.\n\n" +
      "Step 2: On GitHub, open your Dastoor-E-Qalam repo.\n\n" +
      "Step 3: Click catalogue.json → pencil (Edit) → delete all → paste/upload the new file → Commit.\n\n" +
      "Step 4: Wait 1–2 minutes, then open the site on another phone to check.\n\n" +
      "After uploading, click “I uploaded to GitHub” on the site."
  );
}

function downloadCatalogueFile(filename) {
  const blob = new Blob([JSON.stringify(products, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function getFilteredProducts() {
  if (activeCategory === "all") return products;
  return products.filter((p) => p.category === activeCategory);
}

function renderProducts() {
  const filtered = getFilteredProducts();
  productGrid.innerHTML = "";

  emptyState.classList.toggle("hidden", filtered.length > 0);

  for (const product of filtered) {
    const node = productTemplate.content.cloneNode(true);
    const card = node.querySelector(".card");
    const cardImage = node.querySelector(".card-image");
    const cardBadge = node.querySelector(".card-badge");
    const cardTitle = node.querySelector(".card-title");
    const cardPrice = node.querySelector(".card-price");
    const adminActions = node.querySelector(".card-admin-actions");
    const editBtn = node.querySelector(".edit-btn");
    const deleteBtn = node.querySelector(".delete-btn");

    cardImage.src = product.image;
    cardImage.alt = product.name;
    cardBadge.textContent = product.category;
    cardTitle.textContent = product.name;
    cardPrice.textContent = `Rs. ${product.price.toLocaleString("en-IN")}`;

    adminActions.classList.toggle("hidden", !isAdmin);

    editBtn.addEventListener("click", () => openQuickEdit(product));
    deleteBtn.addEventListener("click", () => {
      if (!confirm(`Remove "${product.name}" from the catalogue?`)) return;
      products = products.filter((item) => item.id !== product.id);
      saveProducts();
      renderProducts();
    });

    card.addEventListener("dblclick", () => {
      if (isAdmin) startEditProduct(product);
    });

    productGrid.appendChild(node);
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.readAsDataURL(file);
  });
}
