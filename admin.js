// === Firebase Imports ===
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

// === Firebase Config ===
const firebaseConfig = {
  apiKey: "AIzaSyC6lGL985wSmZIedzN-tnkMGkTI3GU_5Mg",
  authDomain: "ecoshop-536ca.firebaseapp.com",
  projectId: "ecoshop-536ca",
  storageBucket: "ecoshop-536ca.appspot.com",
  messagingSenderId: "330229990087",
  appId: "1:330229990087:web:76246b55267c6a65bab4e2"
};

// Init
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// === Restrict Access to Admin Only ===
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  const roleDoc = await getDoc(doc(db, "roles", user.uid));
  if (!(roleDoc.exists() && roleDoc.data().role === "admin")) {
    alert("Access denied!");
    window.location.href = "index.html";
  }
});

// === Global Variables ===
let productsCache = [];
let filteredProducts = [];
let currentPage = 1;
const itemsPerPage = 10;

// === Generate Upload Form ===
function renderForm(type) {
  return `
    <form id="uploadForm-${type}">
      <h3>Upload to ${type.replace("_"," ")}</h3>
      <input type="text" id="name-${type}" placeholder="Product Name" required>
      <input type="number" id="price-${type}" placeholder="Price" required>
      <textarea id="desc-${type}" placeholder="Description"></textarea>
      <input type="file" id="image-${type}" accept="image/*" required>
      <button type="submit">Upload</button>
    </form>
  `;
}

// === Show Selected Form ===
window.showForm = function(type) {
  document.getElementById("form-container").innerHTML = renderForm(type);

  const form = document.getElementById(`uploadForm-${type}`);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById(`name-${type}`).value;
    const price = parseFloat(document.getElementById(`price-${type}`).value);
    const description = document.getElementById(`desc-${type}`).value;
    const file = document.getElementById(`image-${type}`).files[0];

    if (!file) return alert("Select an image");

    try {
      const storageRef = ref(storage, `${type}/${Date.now()}-${file.name}`);
      await uploadBytes(storageRef, file);
      const imageUrl = await getDownloadURL(storageRef);

      await addDoc(collection(db, "products"), {
        name,
        price,
        description,
        category: ["electronics","fashion","home_appliances","beauty"].includes(type) ? type : null,
        section: ["featured","fast_deal","flash_sale","new_arrivals"].includes(type) ? type : null,
        imageUrl,
        imagePath: storageRef.fullPath,
        createdAt: new Date()
      });

      alert("✅ Product uploaded!");
      form.reset();
      loadProducts();
    } catch (err) {
      console.error(err);
      alert("❌ Upload failed");
    }
  });
};

// === Load Products from Firestore ===
window.loadProducts = async function() {
  const snapshot = await getDocs(collection(db, "products"));
  productsCache = [];
  snapshot.forEach(docSnap => {
    productsCache.push({ id: docSnap.id, ...docSnap.data() });
  });

  filteredProducts = productsCache;
  currentPage = 1;
  renderProducts();
};

// === Render Products with Pagination ===
function renderProducts() {
  const start = (currentPage - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const paginated = filteredProducts.slice(start, end);

  let html = `
    <table>
      <tr>
        <th>Image</th><th>Name</th><th>Price</th><th>Category</th><th>Section</th><th>Actions</th>
      </tr>
  `;

  paginated.forEach(data => {
    html += `
      <tr>
        <td><img src="${data.imageUrl}" width="60"/></td>
        <td>${data.name}</td>
        <td>$${data.price}</td>
        <td>${data.category || '-'}</td>
        <td>${data.section || '-'}</td>
        <td>
          <button onclick="openEdit('${data.id}','${data.name}',${data.price},'${data.category || ""}','${data.section || ""}','${data.imagePath}','${data.imageUrl}')">Edit</button>
          <button onclick="deleteProduct('${data.id}','${data.imagePath}')">Delete</button>
        </td>
      </tr>
    `;
  });

  html += "</table>";
  document.getElementById("product-table").innerHTML = html;

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  document.getElementById("pageInfo").textContent = `Page ${currentPage} of ${totalPages}`;
  document.getElementById("prevPage").disabled = currentPage === 1;
  document.getElementById("nextPage").disabled = currentPage === totalPages;
}

// === Search & Filter Logic ===
document.getElementById("searchBox").addEventListener("input", applyFilters);
document.getElementById("filterCategory").addEventListener("change", applyFilters);
document.getElementById("filterSection").addEventListener("change", applyFilters);

function applyFilters() {
  const searchText = document.getElementById("searchBox").value.toLowerCase();
  const selectedCategory = document.getElementById("filterCategory").value;
  const selectedSection = document.getElementById("filterSection").value;

  filteredProducts = productsCache.filter(p => {
    return (
      (p.name.toLowerCase().includes(searchText)) &&
      (selectedCategory ? p.category === selectedCategory : true) &&
      (selectedSection ? p.section === selectedSection : true)
    );
  });

  currentPage = 1;
  renderProducts();
}

// === Pagination Buttons ===
document.getElementById("prevPage").addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    renderProducts();
  }
});
document.getElementById("nextPage").addEventListener("click", () => {
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    renderProducts();
  }
});

// === Delete Product ===
window.deleteProduct = async function(id, imagePath) {
  if (confirm("Delete this product?")) {
    try {
      await deleteDoc(doc(db, "products", id));
      if (imagePath) {
        await deleteObject(ref(storage, imagePath));
      }
      alert("✅ Deleted!");
      loadProducts();
    } catch (err) {
      console.error(err);
    }
  }
};

// === Edit Product ===
window.openEdit = function(id, name, price, category, section, imagePath, imageUrl) {
  document.getElementById("editModal").style.display = "flex";
  document.getElementById("editName").value = name;
  document.getElementById("editPrice").value = price;
  document.getElementById("editCategory").value = category;
  document.getElementById("editSection").value = section;

  const form = document.getElementById("editForm");
  form.onsubmit = async (e) => {
    e.preventDefault();
    const newName = document.getElementById("editName").value;
    const newPrice = parseFloat(document.getElementById("editPrice").value);
    const newCategory = document.getElementById("editCategory").value || null;
    const newSection = document.getElementById("editSection").value || null;
    const newFile = document.getElementById("editImage").files[0];

    let newImageUrl = imageUrl;
    let newImagePath = imagePath;

    if (newFile) {
      if (imagePath) {
        try { await deleteObject(ref(storage, imagePath)); } catch (err) {}
      }
      const newRef = ref(storage, `products/${Date.now()}-${newFile.name}`);
      await uploadBytes(newRef, newFile);
      newImageUrl = await getDownloadURL(newRef);
      newImagePath = newRef.fullPath;
    }

    await updateDoc(doc(db, "products", id), {
      name: newName,
      price: newPrice,
      category: newCategory,
      section: newSection,
      imageUrl: newImageUrl,
      imagePath: newImagePath
    });

    alert("✅ Product updated!");
    closeEdit();
    loadProducts();
  };
};

window.closeEdit = function() {
  document.getElementById("editModal").style.display = "none";
};

// === Load Default ===
showForm("electronics");
loadProducts();
