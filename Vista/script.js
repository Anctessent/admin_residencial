document.addEventListener("DOMContentLoaded", function () {
    // ==============================
    // 🌍 CONFIGURACIÓN DE AMBIENTE
    // ==============================
    const API_BASE_URL =
        window.location.hostname === "localhost"
            ? "http://localhost:5000"
            : "https://adminresidencial-dmbvd0fdcfd6h9aw.chilecentral-01.azurewebsites.net";

    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");
    const updateInfoForm = document.getElementById("updateInfoForm");
    const visitanteForm = document.getElementById("visitanteForm");
    const nombreResidenteSpan = document.getElementById("nombreResidente");

    // ---------------- LOGIN ----------------
    if (loginForm) {
        loginForm.addEventListener("submit", async function (event) {
            event.preventDefault();

            const cedula = document.getElementById("usuario").value;
            const password = document.getElementById("password").value;

            try {
                const response = await fetch(`${API_BASE_URL}/api/usuarios/login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ cedula, password })
                });

                const data = await response.json();
                if (response.ok) {
                    localStorage.setItem("token", data.token);
                    localStorage.setItem("rol", data.usuario.rol);
                    localStorage.setItem("id", data.usuario.id);
                    localStorage.setItem("nombre", data.usuario.nombre);
                    localStorage.setItem("cedula", data.usuario.cedula);
                    localStorage.setItem("placa", data.usuario.placa || "");
                    mostrarSeccion(data.usuario.rol);
                    alert("✅ Login exitoso");
                } else {
                    alert("❌ Error: " + (data.msg || data.error || "Credenciales inválidas"));
                }
            } catch (error) {
                console.error("❌ Error en login:", error);
                alert("❌ Error al conectar con el servidor: login");
            }
        });
    }

    // ---------------- REGISTRO ----------------
    if (registerForm) {
        registerForm.addEventListener("submit", async function (event) {
            event.preventDefault();
            const formData = new FormData(registerForm);
            const usuarioData = Object.fromEntries(formData.entries());

            if (usuarioData.tieneVehiculo === "1") {
                usuarioData.tieneVehiculo = true;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/api/usuarios/crear`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(usuarioData)
                });

                const data = await response.json();
                if (response.ok) {
                    alert("✅ Usuario registrado con éxito");
                    registerForm.reset();
                } else {
                    alert("❌ Error al registrar: " + (data.msg || data.error));
                }
            } catch (error) {
                console.error("❌ Error en registro:", error);
                alert("❌ Error al conectar con el servidor");
            }
        });
    }

    // ---------------- ACTUALIZAR DATOS ----------------
    updateInfoForm?.addEventListener("submit", async function (event) {
        event.preventDefault();
        const nuevaPlaca = document.getElementById("nuevaPlaca").value;
        const id = localStorage.getItem("id");

        try {
            const response = await fetch(`${API_BASE_URL}/api/usuarios/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify({ placa: nuevaPlaca })
            });

            const data = await response.json();
            if (response.ok) {
                alert("✅ Datos actualizados");
                localStorage.setItem("placa", nuevaPlaca);
                updateInfoForm.reset();
            } else {
                alert("❌ Error al actualizar: " + (data.msg || data.error));
            }
        } catch (error) {
            console.error("❌ Error al actualizar:", error);
            alert("❌ Error al conectar con el servidor");
        }
    });

    // ---------------- REGISTRAR VISITANTE ----------------
    visitanteForm?.addEventListener("submit", async function (event) {
        event.preventDefault();

        const rol = localStorage.getItem("rol");

        const visitanteData = {
            placaVisitante: document.getElementById("placaVisitante").value,
            cedulaVisitante: document.getElementById("cedulaVisitante").value,
            nombreVisitante: document.getElementById("nombreVisitante").value,
            apellidoVisitante: document.getElementById("apellidoVisitante").value,
            residenteId: rol === "admin" ? "admin" : localStorage.getItem("id")
        };

        try {
            const response = await fetch(`${API_BASE_URL}/api/visitantes`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify(visitanteData)
            });

            const data = await response.json();
            if (response.ok) {
                alert("✅ Visitante registrado con éxito");
                visitanteForm.reset();
                if (rol === "residente") {
                    cargarVisitantes();
                } else {
                    listarUsuariosPorRol("visitante", "listaVisitantes", "paginacionVisitantes");
                }
            } else {
                alert("❌ Error al registrar visitante: " + (data.msg || data.error));
            }
        } catch (error) {
            console.error("❌ Error al registrar visitante:", error);
            alert("❌ Error al conectar con el servidor");
        }
    });

    // ==============================
    // 🧍 FUNCIONES DE USUARIO Y ADMIN
    // ==============================

    async function cargarVisitantes() {
        const residenteId = localStorage.getItem("id");
        try {
            const response = await fetch(`${API_BASE_URL}/api/visitantes/misVisitantes/${residenteId}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
            });
            const data = await response.json();
            if (response.ok) {
                const tbody = document.getElementById("tablaVisitantes");
                tbody.innerHTML = "";
                data.forEach(v => {
                    const tr = document.createElement("tr");
                    tr.innerHTML = `
                        <td>${v.nombre}</td>
                        <td>${v.apellido}</td>
                        <td>${v.cedula}</td>
                        <td>${v.placaVehiculo}</td>
                        <td>${v.parqueadero ? v.parqueadero.numero : "No asignado"}</td>
                        <td>
                            <button class="btn-rojo-sm" onclick="eliminarVisitante('${residenteId}','${v._id}')">❌ Eliminar</button>
                            <button class="btn-azul-sm" onclick="abrirEditarVisitante('${v._id}','${v.nombre}','${v.apellido}','${v.cedula}','${v.placaVehiculo}')">✏️ Editar</button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
            }
        } catch (error) {
            console.error("Error al cargar visitantes:", error);
        }
    }

    // ---------------- MOSTRAR SECCIÓN SEGÚN ROL ----------------
    function mostrarSeccion(seccion) {
        if (seccion === "admin") {
            window.location.href = "/admin";
        } else if (seccion === "residente") {
            window.location.href = "/residente";
        } else if (seccion === "porteria") {
            window.location.href = "/porteria";
        } else {
            window.location.href = "/";
        }
    }

    // ---------------- CERRAR SESIÓN ----------------
    window.volverAlLogin = function () {
        localStorage.clear();
        window.location.href = "/";
    };

    // ---------------- AUTOLOGIN ----------------
    const token = localStorage.getItem("token");
    const rol = localStorage.getItem("rol");
    if (token && rol) {
        if (rol === "residente") {
            document.getElementById("nombreResidente").textContent = localStorage.getItem("nombre") || "Usuario Desconocido";
            document.getElementById("nuevaPlaca").value = localStorage.getItem("placa") || "";
            cargarVisitantes();
        } else if (rol === "admin") {
            listarUsuariosPorRol("residente","listaResidentes","paginacionResidentes");
            listarUsuariosPorRol("visitante","listaVisitantes","paginacionVisitantes");
            listarUsuariosPorRol("porteria","listaPorteros","paginacionPorteros");
        } else {
            mostrarSeccion(rol);
        }
    }
});
