;(() => {
  const API_USERS = "https://dummyjson.com/users"
  const API_RECIPES_BASE = "https://dummyjson.com/recipes"
  const STORAGE_KEY_FIRSTNAME = "recipesApp.firstName"

  const $ = (sel, root = document) => root.querySelector(sel)
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)]

  const setYear = () => {
    const y = $("#year")
    if (y) y.textContent = new Date().getFullYear()
  }

  const showMessage = (el, msg, type = "") => {
    if (!el) return
    el.textContent = msg || ""
    el.classList.remove("alert--error", "alert--success")
    if (type === "error") el.classList.add("alert--error")
    if (type === "success") el.classList.add("alert--success")
  }

  const withDebounce = (fn, delay = 300) => {
    let t = null
    return (...args) => {
      clearTimeout(t)
      t = setTimeout(() => fn(...args), delay)
    }
  }

  // LOGIN PAGE
  async function handleLoginPage() {
    const form = $("#loginForm")
    const btn = $("#loginBtn")
    const msg = $("#loginMessage")

    if (!form) return

    // Redirect jika sudah login
    const existing = localStorage.getItem(STORAGE_KEY_FIRSTNAME)
    if (existing) {
      window.location.href = "recipes.html"
      return
    }

    let isLoading = false

    const setLoading = (state) => {
      isLoading = state
      const spinner = btn?.querySelector(".spinner")
      const label = btn?.querySelector(".btn__label")
      if (spinner) spinner.style.display = state ? "inline-block" : "none"
      if (label) label.textContent = state ? "Loading..." : "Login"
      btn.disabled = !!state
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault()
      if (isLoading) return

      const username = $("#username")?.value?.trim() || ""
      const password = $("#password")?.value || ""

      showMessage(msg, "")
      if (!username) {
        showMessage(msg, "Username wajib diisi.", "error")
        return
      }
      if (!password) {
        showMessage(msg, "Password tidak boleh kosong.", "error")
        return
      }

      try {
        setLoading(true)
        // Loading state visible
        const res = await fetch(API_USERS)
        if (!res.ok) throw new Error(`Gagal menghubungi Users API (${res.status})`)
        const data = await res.json()

        const users = Array.isArray(data?.users) ? data.users : []
        const found = users.find((u) => String(u.username || "").toLowerCase() === username.toLowerCase())

        if (!found) {
          showMessage(msg, "Username tidak ditemukan atau salah.", "error")
          return
        }

        // Syarat dari soal: password cukup tidak kosong, tidak perlu verifikasi ke API.
        const firstName = found.firstName || "User"
        localStorage.setItem(STORAGE_KEY_FIRSTNAME, firstName)

        showMessage(msg, `Login berhasil. Selamat datang, ${firstName}!`, "success")

        // Redirect otomatis
        setTimeout(() => {
          window.location.href = "recipes.html"
        }, 800)
      } catch (err) {
        console.error("[v0] Login error:", err)
        showMessage(msg, "Terjadi kesalahan koneksi ke API. Coba lagi.", "error")
      } finally {
        setLoading(false)
      }
    })
  }

  // RECIPES PAGE
  async function handleRecipesPage() {
    const grid = $("#recipesGrid")
    const message = $("#recipesMessage")
    const showMoreBtn = $("#showMoreBtn")
    const searchInput = $("#searchInput")
    const clearSearchBtn = $("#clearSearchBtn")
    const statusBar = $("#statusBar")
    const greeting = $("#greeting")
    const logoutBtn = $("#logoutBtn")

    if (!grid) return

    // Proteksi: harus login
    const firstName = localStorage.getItem(STORAGE_KEY_FIRSTNAME)
    if (!firstName) {
      window.location.replace("login.html")
      return
    }
    if (greeting) greeting.textContent = `Hi, ${firstName}`

    // Logout
    logoutBtn?.addEventListener("click", () => {
      localStorage.removeItem(STORAGE_KEY_FIRSTNAME)
      window.location.href = "login.html"
    })

    // State
    let allRecipes = []
    let filteredRecipes = []
    let visibleCount = 12
    const PAGE_SIZE = 20

    const setStatus = (txt) => {
      if (statusBar) statusBar.textContent = txt || ""
    }

    const setGridLoading = (isLoading) => {
      if (isLoading) {
        setStatus("Memuat resep...")
      } else {
        setStatus("")
      }
    }

    const fetchAllRecipes = async () => {
      setGridLoading(true)
      try {
        // Ambil batch pertama untuk fast render
        let skip = 0
        let total = 0
        let acc = []

        const first = await fetch(`${API_RECIPES_BASE}?limit=${PAGE_SIZE}&skip=${skip}`)
        if (!first.ok) throw new Error(`Gagal memuat recipes (${first.status})`)
        const firstJson = await first.json()
        total = Number(firstJson.total || 0)
        acc = acc.concat(firstJson.recipes || [])
        skip += PAGE_SIZE

        // Fetch sisa di background
        while (skip < total) {
          const res = await fetch(`${API_RECIPES_BASE}?limit=${PAGE_SIZE}&skip=${skip}`)
          if (!res.ok) throw new Error(`Gagal memuat recipes (${res.status})`)
          const json = await res.json()
          acc = acc.concat(json.recipes || [])
          skip += PAGE_SIZE
        }

        allRecipes = acc
        filteredRecipes = allRecipes
        render()
      } catch (err) {
        console.error("[v0] Recipes fetch error:", err)
        showMessage(message, "Gagal memuat data resep. Silakan coba lagi.", "error")
      } finally {
        setGridLoading(false)
      }
    }

    const formatMinutes = (m) => `${m ?? 0}m`
    const stars = (rating) => {
      const r = Math.round((Number(rating) || 0) * 2) / 2 // nearest 0.5
      const full = Math.floor(r)
      const half = r % 1 !== 0 ? 1 : 0
      const empty = 5 - full - half
      return "★".repeat(full) + (half ? "☆" : "") + "✩".repeat(empty)
    }

    const recipeCard = (r) => {
      // safe fields
      const ing = Array.isArray(r.ingredients) ? r.ingredients.slice(0, 5).join(", ") : ""
      const difficulty = r.difficulty || "-"
      const cuisine = r.cuisine || "-"
      const img = r.image || "/placeholder.svg"
      const rating = r.rating ?? 0
      const time = r.cookTimeMinutes ?? r.prepTimeMinutes ?? 0

      return `
        <article class="recipe" data-id="${r.id}">
          <img class="recipe__img" src="${img}" alt="Foto ${r.name || "Recipe"}" />
          <div class="recipe__body">
            <h3 class="recipe__title">${r.name || "Untitled"}</h3>
            <div class="recipe__meta">
              <span class="recipe__rating" title="Rating ${rating}">${stars(rating)} <span style="color:var(--muted);margin-left:6px;">(${rating.toFixed ? rating.toFixed(1) : rating})</span></span>
              <span>•</span>
              <span>Time: ${formatMinutes(time)}</span>
              <span>•</span>
              <span>Difficulty: ${difficulty}</span>
              <span>•</span>
              <span>Cuisine: ${cuisine}</span>
            </div>
            <div class="recipe__ingredients">Ingredients: ${ing || "-"}</div>
          </div>
          <div class="recipe__actions">
            <button class="btn btn--secondary" data-view="${r.id}">View Full Recipe</button>
            <span class="chip">#${(r.tags?.[0] || "recipe").toLowerCase()}</span>
          </div>
        </article>
      `
    }

    const render = () => {
      showMessage(message, "")
      const list = filteredRecipes.slice(0, visibleCount)
      grid.innerHTML = list.map(recipeCard).join("")
      // toggle show more
      if (filteredRecipes.length > visibleCount) {
        showMoreBtn.style.display = "inline-block"
      } else {
        showMoreBtn.style.display = "none"
      }
      const countInfo = filteredRecipes.length
        ? `Menampilkan ${Math.min(visibleCount, filteredRecipes.length)} dari ${filteredRecipes.length} resep`
        : "Tidak ada resep ditemukan"
      setStatus(countInfo)
    }

    // Show More
    showMoreBtn?.addEventListener("click", () => {
      visibleCount += 12
      render()
    })

    // Search (debounced)
    const applySearch = (qRaw) => {
      const q = String(qRaw || "")
        .trim()
        .toLowerCase()
      visibleCount = 12
      if (!q) {
        filteredRecipes = allRecipes
        render()
        return
      }
      filteredRecipes = allRecipes.filter((r) => {
        const name = (r.name || "").toLowerCase()
        const cuisine = (r.cuisine || "").toLowerCase()
        const ingredients = (Array.isArray(r.ingredients) ? r.ingredients.join(" ") : "").toLowerCase()
        const tags = (Array.isArray(r.tags) ? r.tags.join(" ") : "").toLowerCase()
        return name.includes(q) || cuisine.includes(q) || ingredients.includes(q) || tags.includes(q)
      })
      render()
    }

    const debouncedSearch = withDebounce(applySearch, 300)
    searchInput?.addEventListener("input", (e) => debouncedSearch(e.target.value))
    clearSearchBtn?.addEventListener("click", () => {
      if (searchInput) searchInput.value = ""
      applySearch("")
      searchInput?.focus()
    })

    // Modal
    const modal = $("#modal")
    const modalBody = $("#modalBody")
    const openModal = (html) => {
      if (!modal) return
      modalBody.innerHTML = html
      modal.setAttribute("aria-hidden", "false")
      document.body.style.overflow = "hidden"
    }
    const closeModal = () => {
      if (!modal) return
      modal.setAttribute("aria-hidden", "true")
      modalBody.innerHTML = ""
      document.body.style.overflow = ""
    }
    modal?.addEventListener("click", (e) => {
      if (e.target.matches("[data-close-modal], .modal__backdrop")) {
        closeModal()
      }
    })
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModal()
    })

    // Delegasi klik untuk View Full Recipe
    grid.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-view]")
      if (!btn) return
      const id = Number(btn.getAttribute("data-view"))
      const r = allRecipes.find((x) => Number(x.id) === id)
      if (!r) return
      const detailHTML = `
        <div class="card">
          <img class="recipe__img" src="${r.image}" alt="Foto ${r.name}" />
          <h4 style="margin:10px 0 6px;">${r.name}</h4>
          <div class="meta">
            <span>Rating: ${r.rating ?? 0}</span>
            <span>Servings: ${r.servings ?? "-"}</span>
            <span>Difficulty: ${r.difficulty || "-"}</span>
            <span>Cuisine: ${r.cuisine || "-"}</span>
            <span>Prep: ${r.prepTimeMinutes ?? 0}m</span>
            <span>Cook: ${r.cookTimeMinutes ?? 0}m</span>
          </div>
          <div>
            <h5>Ingredients</h5>
            <div class="chips">
              ${(r.ingredients || []).map((i) => `<span class="chip">${i}</span>`).join("")}
            </div>
          </div>
          <div>
            <h5>Tags</h5>
            <div class="chips">
              ${(r.tags || []).map((t) => `<span class="chip">#${t}</span>`).join("")}
            </div>
          </div>
          <div>
            <h5>Instructions</h5>
            <ol style="margin:6px 0 0 18px;">
              ${(r.instructions || []).map((step) => `<li style="margin:4px 0;">${step}</li>`).join("")}
            </ol>
          </div>
        </div>
      `
      openModal(detailHTML)
    })

    // Fetch data
    await fetchAllRecipes()
  }

  // Init
  document.addEventListener("DOMContentLoaded", () => {
    setYear()

    const page = document.documentElement.getAttribute("data-page") || document.body.getAttribute("data-page")
    if (page === "login") {
      handleLoginPage()
    } else if (page === "recipes") {
      handleRecipesPage()
    }
  })
})()
