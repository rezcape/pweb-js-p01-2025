// Menjalankan script setelah seluruh konten DOM dimuat
document.addEventListener("DOMContentLoaded", () => {
  // Mengecek di halaman mana kita berada dan menjalankan fungsi yang sesuai
  if (document.getElementById("login-form")) {
    initLoginPage();
  } else if (document.getElementById("recipes-container")) {
    initRecipesPage();
  }
});

// =================================================================
// LOGIN PAGE LOGIC
// =================================================================
function initLoginPage() {
  // Jika sudah login, langsung arahkan ke halaman resep
  if (localStorage.getItem("userFirstName")) {
    window.location.href = "recipes.html";
    return;
  }

  const loginForm = document.getElementById("login-form");
  const loginButton = document.getElementById("login-button");
  const messageContainer = document.getElementById("message-container");

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault(); // Mencegah form dari reload halaman

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    // Validasi sederhana
    if (!username || !password) {
      showMessage("Username and password cannot be empty.", "error");
      return;
    }

    // Menampilkan state loading
    loginButton.disabled = true;
    loginButton.textContent = "Logging in...";
    showMessage(""); // Menghapus pesan sebelumnya

    try {
      // Menggunakan endpoint /auth/login untuk autentikasi yang lebih sesuai
      const response = await fetch("https://dummyjson.com/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username,
          password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Menangani error dari API (contoh: username/password salah)
        throw new Error(data.message || "Login failed!");
      }

      // Jika login berhasil
      showMessage("Login successful! Redirecting...", "success");
      localStorage.setItem("userFirstName", data.firstName);
      localStorage.setItem("userToken", data.token); // Simpan token untuk praktik terbaik

      // Arahkan ke halaman resep setelah 1.5 detik
      setTimeout(() => {
        window.location.href = "recipes.html";
      }, 1500);
    } catch (error) {
      // Menangani error koneksi atau error lainnya
      console.error("Login Error:", error);
      showMessage(error.message, "error");
      loginButton.disabled = false;
      loginButton.textContent = "Login";
    }
  });

  function showMessage(message, type = "info") {
    messageContainer.textContent = message;
    messageContainer.className = `message ${type}`;
  }
}

// =================================================================
// RECIPES PAGE LOGIC
// =================================================================
function initRecipesPage() {
  // === 1. Proteksi Halaman ===
  const userFirstName = localStorage.getItem("userFirstName");
  if (!userFirstName) {
    // Jika tidak ada data user, tendang kembali ke halaman login
    alert("You must be logged in to view this page.");
    window.location.href = "login.html";
    return;
  }

  // === 2. Inisialisasi Variabel dan Elemen DOM ===
  const userNameElement = document.getElementById("user-name");
  const logoutButton = document.getElementById("logout-button");
  const recipesContainer = document.getElementById("recipes-container");
  const searchInput = document.getElementById("search-input");
  const cuisineFilter = document.getElementById("cuisine-filter");
  const showMoreButton = document.getElementById("show-more-button");
  const loader = document.getElementById("loader");
  const errorMessageElement = document.getElementById("error-message");

  // State Management
  let allRecipes = [];
  let filteredRecipes = [];
  let uniqueCuisines = new Set();
  let recipesToShow = 9; // Jumlah resep yang ditampilkan per halaman

  // === 3. Setup Halaman Awal ===
  userNameElement.textContent = userFirstName;

  logoutButton.addEventListener("click", () => {
    localStorage.clear(); // Hapus semua data dari localStorage
    window.location.href = "login.html";
  });

  // === 4. Fetch dan Tampilkan Data Resep ===
  async function fetchRecipes() {
    showLoader(true);
    try {
      // Ambil semua resep sekaligus
      const response = await fetch("https://dummyjson.com/recipes?limit=0");
      if (!response.ok) throw new Error("Failed to fetch recipes.");
      const data = await response.json();

      allRecipes = data.recipes;
      filteredRecipes = [...allRecipes]; // Salin semua resep ke array filter awal

      populateCuisineFilter();
      displayRecipes();
    } catch (error) {
      showError(error.message);
    } finally {
      showLoader(false);
    }
  }

  function displayRecipes() {
    recipesContainer.innerHTML = ""; // Kosongkan container
    const recipesToDisplay = filteredRecipes.slice(0, recipesToShow);

    if (recipesToDisplay.length === 0) {
      recipesContainer.innerHTML =
        "<p>No recipes found matching your criteria.</p>";
    }

    recipesToDisplay.forEach((recipe) => {
      const card = document.createElement("div");
      card.className = "recipe-card";
      card.innerHTML = `
                <img src="${recipe.image}" alt="${recipe.name}">
                <div class="card-content">
                    <h3>${recipe.name}</h3>
                    <p class="cuisine">${recipe.cuisine}</p>
                    <div class="details">
                        <span>🕒 ${recipe.cookTimeMinutes} min</span>
                        <span>🔥 ${recipe.difficulty}</span>
                    </div>
                    <div class="rating">${generateStars(recipe.rating)}</div>
                    <p class="ingredients"><b>Ingredients:</b> ${recipe.ingredients
                      .slice(0, 3)
                      .join(", ")}...</p>
                    <button class="view-recipe-btn" data-id="${
                      recipe.id
                    }">View Full Recipe</button>
                </div>
            `;
      recipesContainer.appendChild(card);
    });

    // Tampilkan atau sembunyikan tombol "Show More"
    if (filteredRecipes.length > recipesToShow) {
      showMoreButton.style.display = "block";
    } else {
      showMoreButton.style.display = "none";
    }
  }

  // === 5. Fitur Filter dan Search ===
  function populateCuisineFilter() {
    allRecipes.forEach((recipe) => uniqueCuisines.add(recipe.cuisine));
    uniqueCuisines.forEach((cuisine) => {
      const option = document.createElement("option");
      option.value = cuisine;
      option.textContent = cuisine;
      cuisineFilter.appendChild(option);
    });
  }

  function handleFilterAndSearch() {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedCuisine = cuisineFilter.value;

    filteredRecipes = allRecipes.filter((recipe) => {
      const matchesCuisine =
        !selectedCuisine || recipe.cuisine === selectedCuisine;

      const matchesSearch =
        !searchTerm ||
        recipe.name.toLowerCase().includes(searchTerm) ||
        recipe.cuisine.toLowerCase().includes(searchTerm) ||
        recipe.tags.some((tag) => tag.toLowerCase().includes(searchTerm)) ||
        recipe.ingredients.some((ing) =>
          ing.toLowerCase().includes(searchTerm)
        );

      return matchesCuisine && matchesSearch;
    });

    recipesToShow = 9; // Reset jumlah resep saat filter/search baru
    displayRecipes();
  }

  // Debouncing untuk search real-time
  let debounceTimer;
  searchInput.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(handleFilterAndSearch, 300); // Tunda eksekusi selama 300ms
  });

  cuisineFilter.addEventListener("change", handleFilterAndSearch);

  // === 6. Fitur "Show More" ===
  showMoreButton.addEventListener("click", () => {
    recipesToShow += 9;
    displayRecipes();
  });

  // === 7. Fitur Modal Detail Resep ===
  const modal = document.getElementById("recipe-modal");
  const modalBody = document.getElementById("modal-body");
  const closeModalButton = document.querySelector(".close-button");

  recipesContainer.addEventListener("click", (e) => {
    const viewButton = e.target.closest(".view-recipe-btn");
    if (viewButton) {
      const recipeId = parseInt(viewButton.dataset.id);
      const recipe = allRecipes.find((r) => r.id === recipeId);
      if (recipe) {
        showRecipeModal(recipe);
      }
    }
  });

  function showRecipeModal(recipe) {
    modalBody.innerHTML = `
            <h2>${recipe.name}</h2>
            <img src="${recipe.image}" alt="${
      recipe.name
    }" style="width:100%; max-height: 300px; object-fit: cover;">
            <p><strong>Cuisine:</strong> ${recipe.cuisine}</p>
            <p><strong>Difficulty:</strong> ${recipe.difficulty}</p>
            <p><strong>Cook Time:</strong> ${recipe.cookTimeMinutes} minutes</p>
            <p><strong>Rating:</strong> ${recipe.rating} / 5 (${
      recipe.reviewCount
    } reviews)</p>
            <h3>Ingredients:</h3>
            <ul>
                ${recipe.ingredients.map((ing) => `<li>${ing}</li>`).join("")}
            </ul>
            <h3>Instructions:</h3>
            <ol>
                ${recipe.instructions
                  .map((step) => `<li>${step}</li>`)
                  .join("")}
            </ol>
        `;
    modal.style.display = "block";
  }

  closeModalButton.onclick = () => (modal.style.display = "none");
  window.onclick = (event) => {
    if (event.target == modal) {
      modal.style.display = "none";
    }
  };

  // === 8. Utility Functions ===
  function generateStars(rating) {
    let stars = "";
    for (let i = 1; i <= 5; i++) {
      stars += i <= rating ? "⭐" : "☆";
    }
    return stars;
  }

  function showLoader(isLoading) {
    loader.style.display = isLoading ? "block" : "none";
  }

  function showError(message) {
    errorMessageElement.textContent = message;
    errorMessageElement.style.display = "block";
  }

  // === 9. Panggil fungsi fetch awal ===
  fetchRecipes();
}
