// admin.js (complete)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, getDoc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-storage.js";
import {
  getAuth, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

/* ---------- Firebase config: keep your values ---------- */
const firebaseConfig = {
  apiKey: "AIzaSyC6lGL985wSmZIedzN-tnkMGkTI3GU_5Mg",
  authDomain: "ecoshop-536ca.firebaseapp.com",
  projectId: "ecoshop-536ca",
  storageBucket: "ecoshop-536ca.appspot.com",
  messagingSenderId: "330229990087",
  appId: "1:330229990087:web:76246b55267c6a65bab4e2"
};
/* ------------------------------------------------------ */

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

/* ------- Utility & state ------- */
const statusEl = document.getElementById("status");
let productsCache = [];
let filteredProducts = [];
let currentPage = 1;
const itemsPerPage = 10;

/* ------- Helper: show status & console ------- */
function setStatus(msg, isError=false) {
  if (statusEl) { statusEl.textContent = msg; statusEl.style.color = isError ? "red" : "green"; }
  console.log("[ADMIN STATUS]", msg);
}

/* ------- Role check & ensure admin ------- */
onAuthStateChanged(auth, async (user) => {
  console.log("Auth state changed. User:", user && user.email);
  if (!user) {
    setStatus("Not signed in - redirecting to login...", true);
    setTimeout(()=> window.location.href = "login.html", 800);
    return;
  }

  try {
    const roleSnap = await getDoc(doc(db, "roles", user.uid));
    if (!roleSnap.exists() || roleSnap.data().role !== "admin") {
      setStatus("Access denied: you are not an admin", true);
      console.warn("User is not admin or roles doc missing:", user.uid);
      setTimeout(()=> window.location.href = "index.html", 1000);
      return;
    }
    setStatus(`Welcome ${user.email} — you are admin`);
    // now safe to load UI
    showForm("men");
    await loadProducts();
  } catch (err) {
    console.error("Role check error:", err);
    setStatus("Role check failed: " + err.message, true);
  }
});

/* ------- Render & show form (single dynamic form) ------- */
function formHtml(category) {
  return `
    <form id="uploadForm" class="upload-form">
      <h3>Upload product — ${category}</h3>
      <input id="productName" type="text" placeholder="Product name" required />
      <input id="productPrice" type="number" placeholder="Price (₵)" required />
      <textarea id="productDesc" placeholder="Description" rows="4"></textarea>

      <label>Category</label>
      <select id="productCategory" required>
        <option value="${category}">${category}</option>
        <option value="men">men</option>
        <option value="women">women</option>
        <option value="kids">kids</option>
        <option value="muslim">muslim</option>
        <option value="health_beauty">health_beauty</option>
        <option value="accessories">accessories</option>
        <option value="home_kitchen">home_kitchen</option>
        <option value="baby_toddler">baby_toddler</option>
      </select>

      <label>Section (optional)</label>
      <select id="productSection">
        <option value="">none</option>
        <option value="featured">featured</option>
        <option value="fast_deal">fast_deal</option>
        <option value="flash_sale">flash_sale</option>
        <option value="new_arrivals">new_arrivals</option>
      </select>

      <label>Image</label>
      <input id="productImage" type="file" accept="image/*" required />
      <div style="margin-top:8px;"><button type="submit">Upload</button></div>
    </form>
  `;
}

window.showForm = function(category) {
  const container = document.getElementById("form-container");
  if (!container) { console.error("form-container not found"); return; }
  container.innerHTML = formHtml(category);

  const form = document.getElementById("uploadForm");
  form.onsubmit = async (e) => {
    e.preventDefault();
    setStatus("Uploading...");

    const name = document.getElementById("productName").value.trim();
    const price = Number(document.getElementById("productPrice").value);
    const description = document.getElementById("productDesc").value.trim();
    const categoryVal = document.getElementById("productCategory").value;
    const sectionVal = document.getElementById("productSection").value || null;
    const file = document.getElementById("productImage").files[0];

    if (!file) {
      setStatus("Please choose an image file", true);
      return;
    }

    try {
      console.log("Uploading file to Storage...");
      const path = `products/${categoryVal}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      console.log("Saving product doc in Firestore...");
      await addDoc(collection(db, "products"), {
        name,
        price,
        description,
        category: categoryVal,
        section: sectionVal,
        imageUrl: url,
        imagePath: storageRef.fullPath,
        createdAt: new Date()
      });

      setStatus("✅ Product uploaded");
      form.reset();
      await loadProducts();
    } catch (err) {
      console.error("Upload error:", err);
      setStatus("Upload failed: " + (err.message || err), true);
      alert("Upload error: " + (err.message || err));
    }
  };
};

/* ------- Load products, cache, render ------- */
window.loadProducts = async function() {
  try {
    setStatus("Loading products...");
    const snap = await getDocs(collection(db, "products"));
    productsCache = [];
    snap.forEach(s => productsCache.push({ id: s.id, ...s.data() }));
    filteredProducts = productsCache;
    currentPage = 1;
    renderProducts();
    setStatus("Products loaded: " + productsCache.length);
  } catch (err) {
    console.error("Load products failed:", err);
    setStatus("Failed to load products: " + err.message, true);
  }
};

function renderProducts() {
  const start = (currentPage - 1) * itemsPerPage;
  const pageItems = filteredProducts.slice(start, start + itemsPerPage);
  const table = document.getElementById("product-table");
  if (!table) return;

  let html = `<table><tr><th>Image</th><th>Name</th><th>Price</th><th>Category</th><th>Section</th><th>Actions</th></tr>`;
  for (const p of pageItems) {
    html += `<tr>
      <td><img src="${p.imageUrl}" width="60"/></td>
      <td>${p.name}</td>
      <td>₵${p.price}</td>
      <td>${p.category||'-'}</td>
      <td>${p.section||'-'}</td>
      <td>
        <button onclick="openEdit('${p.id}','${escape(p.name)}',${p.price},'${p.category||""}','${p.section||""}','${p.imagePath||""}','${p.imageUrl||""}')">Edit</button>
        <button onclick="deleteProduct('${p.id}','${p.imagePath||""}')">Delete</button>
      </td>
    </tr>`;
  }
  html += "</table>";
  table.innerHTML = html;

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage));
  document.getElementById("pageInfo").textContent = `Page ${currentPage} of ${totalPages}`;
  document.getElementById("prevPage").disabled = currentPage === 1;
  document.getElementById("nextPage").disabled = currentPage === totalPages;
}

/* ------- search & filters ------- */
document.getElementById("searchBox").addEventListener("input", applyFilters);
document.getElementById("filterCategory").addEventListener("change", applyFilters);
document.getElementById("filterSection").addEventListener("change", applyFilters);

function applyFilters() {
  const q = document.getElementById("searchBox").value.toLowerCase();
  const cat = document.getElementById("filterCategory").value;
  const sec = document.getElementById("filterSection").value;

  filteredProducts = productsCache.filter(p => {
    return p.name.toLowerCase().includes(q) &&
      (cat ? p.category === cat : true) &&
      (sec ? p.section === sec : true);
  });
  currentPage = 1;
  renderProducts();
}

/* ------- pagination handlers ------- */
document.getElementById("prevPage").addEventListener("click", ()=> { if (currentPage>1) { currentPage--; renderProducts(); }});
document.getElementById("nextPage").addEventListener("click", ()=> {
  const total = Math.ceil(filteredProducts.length / itemsPerPage);
  if (currentPage < total) { currentPage++; renderProducts(); }
});

/* ------- delete product ------- */
window.deleteProduct = async function(id, imagePath) {
  if (!confirm("Delete product?")) return;
  try {
    await deleteDoc(doc(db, "products", id));
    if (imagePath) { await deleteObject(ref(storage, imagePath)).catch(()=>{}); }
    setStatus("Product deleted");
    await loadProducts();
  } catch (err) { console.error(err); setStatus("Delete failed: "+err.message,true); }
};

/* ------- edit product modal ------- */
window.openEdit = function(id, name, price, category, section, imagePath, imageUrl) {
  const modal = document.getElementById("editModal");
  modal.style.display = "flex";
  document.getElementById("editName").value = decodeURIComponent(name);
  document.getElementById("editPrice").value = price;
  // fill category options and select current
  document.getElementById("editCategory").innerHTML = `
    <option value="men" ${category==='men'?'selected':''}>men</option>
    <option value="women" ${category==='women'?'selected':''}>women</option>
    <option value="kids" ${category==='kids'?'selected':''}>kids</option>
    <option value="muslim" ${category==='muslim'?'selected':''}>muslim</option>
    <option value="health_beauty" ${category==='health_beauty'?'selected':''}>health_beauty</option>
    <option value="accessories" ${category==='accessories'?'selected':''}>accessories</option>
    <option value="home_kitchen" ${category==='home_kitchen'?'selected':''}>home_kitchen</option>
    <option value="baby_toddler" ${category==='baby_toddler'?'selected':''}>baby_toddler</option>
  `;
  document.getElementById("editSection").innerHTML = `
    <option value="">none</option>
    <option value="featured" ${section==='featured'?'selected':''}>featured</option>
    <option value="fast_deal" ${section==='fast_deal'?'selected':''}>fast_deal</option>
    <option value="flash_sale" ${section==='flash_sale'?'selected':''}>flash_sale</option>
    <option value="new_arrivals" ${section==='new_arrivals'?'selected':''}>new_arrivals</option>
  `;

  const form = document.getElementById("editForm");
  form.onsubmit = async (e) => {
    e.preventDefault();
    const newName = document.getElementById("editName").value;
    const newPrice = Number(document.getElementById("editPrice").value);
    const newCategory = document.getElementById("editCategory").value;
    const newSection = document.getElementById("editSection").value || null;
    const newFile = document.getElementById("editImage").files[0];

    try {
      let newImageUrl = imageUrl;
      let newImagePath = imagePath;

      if (newFile) {
        if (imagePath) { await deleteObject(ref(storage, imagePath)).catch(()=>{}); }
        const newRef = ref(storage, `products/${newCategory}/${Date.now()}_${newFile.name}`);
        await uploadBytes(newRef, newFile);
        newImageUrl = await getDownloadURL(newRef);
        newImagePath = newRef.fullPath;
      }

      await updateDoc(doc(db, "products", id), {
        name: newName, price: newPrice, category: newCategory, section: newSection,
        imageUrl: newImageUrl, imagePath: newImagePath
      });

      setStatus("Product updated");
      closeEdit();
      await loadProducts();
    } catch (err) {
      console.error(err); setStatus("Update failed: "+err.message,true);
    }
  };
};

window.closeEdit = function() { document.getElementById("editModal").style.display = "none"; };

// keep default: load men form & products (but only after auth role check runs)
