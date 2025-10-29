document.addEventListener("DOMContentLoaded", function () { 
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
                const response = await fetch("http://localhost:5000/api/usuarios/login", {
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
                const response = await fetch("http://localhost:5000/api/usuarios/crear", {
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
            const response = await fetch(`http://localhost:5000/api/usuarios/${id}`, {
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
        residenteId: rol === "admin" ? "admin" : localStorage.getItem("id") // 👈 Aquí el cambio
    };

    try {
        const response = await fetch("http://localhost:5000/api/visitantes", {
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
                cargarVisitantes(); // refrescar lista solo si es residente
            } else {
                listarUsuariosPorRol("visitante","listaVisitantes","paginacionVisitantes"); // refrescar lista en admin
            }
        } else {
            alert("❌ Error al registrar visitante: " + (data.msg || data.error));
        }
    } catch (error) {
        console.error("❌ Error al registrar visitante:", error);
        alert("❌ Error al conectar con el servidor");
    }
});


   // ---------------- LISTAR VISITANTES ----------------
   async function cargarVisitantes() {
        const residenteId = localStorage.getItem("id");
        try {
            const response = await fetch(`http://localhost:5000/api/visitantes/misVisitantes/${residenteId}`, {
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

    // ---------------- EDITAR VISITANTE ----------------
    window.abrirEditarVisitante = function (id, nombre, apellido, cedula, placa) {
        document.getElementById("editVisitanteId").value = id;
        document.getElementById("editNombre").value = nombre;
        document.getElementById("editApellido").value = apellido;
        document.getElementById("editCedula").value = cedula;
        document.getElementById("editPlaca").value = placa;
        document.getElementById("editarModal").style.display = "block";
    };

    window.cerrarEditarModal = function () {
        document.getElementById("editarModal").style.display = "none";
    };

    document.getElementById("editarVisitanteForm")?.addEventListener("submit", async function (event) {
        event.preventDefault();

        const visitanteId = document.getElementById("editVisitanteId").value;
        const visitanteData = {
            nombre: document.getElementById("editNombre").value,
            apellido: document.getElementById("editApellido").value,
            cedula: document.getElementById("editCedula").value,
            placaVehiculo: document.getElementById("editPlaca").value
        };

        try {
            const response = await fetch(`http://localhost:5000/api/visitantes/editarVisitante/${visitanteId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify(visitanteData)
            });

            const data = await response.json();
            if (response.ok) {
                alert("✅ Visitante actualizado con éxito");
                cerrarEditarModal();
                cargarVisitantes();
            } else {
                alert("❌ Error: " + (data.msg || data.mensaje || "No se pudo actualizar"));
            }
        } catch (error) {
            console.error("Error al actualizar visitante:", error);
        }
    });

    // ---------------- ELIMINAR VISITANTE ----------------
    window.eliminarVisitante = async function (residenteId, visitanteId) {
        if (!confirm("¿Seguro que deseas eliminar este visitante?")) return;
        try {
            const response = await fetch(`http://localhost:5000/api/visitantes/eliminarVisitante/${residenteId}/${visitanteId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
            });
            const data = await response.json();
            if (response.ok) {
                alert("✅ Visitante eliminado y plaza liberada");
                cargarVisitantes();
            } else {
                alert("❌ Error: " + (data.msg || data.mensaje || "No se pudo eliminar"));
            }
        } catch (error) {
            console.error("Error al eliminar visitante:", error);
        }
    };

    // ---------------- FUNCIONES ADMIN ----------------
    async function listarUsuariosPorRol(rol, listaId, paginacionId, pagina = 1) {
        const lista = document.getElementById(listaId);
        const paginacion = document.getElementById(paginacionId);
        if (!lista) return;
        lista.innerHTML = "<h3>Cargando...</h3>";
        paginacion.innerHTML = "";

        try {
            const response = await fetch("http://localhost:5000/api/usuarios", {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                }
            });

            if (!response.ok) throw new Error("Error al obtener usuarios");

            const data = await response.json();
            let filtrados = data.data.filter(user => user.rol === rol);

            const usuariosPorPagina = 20;
            const totalPaginas = Math.ceil(filtrados.length / usuariosPorPagina);
            const inicio = (pagina - 1) * usuariosPorPagina;
            const fin = inicio + usuariosPorPagina;
            const usuariosPagina = filtrados.slice(inicio, fin);

            lista.innerHTML = "";
            usuariosPagina.forEach(user => {
                lista.innerHTML += `
                    <div class="usuario-item">
                        <p><strong>${user.nombre} ${user.apellido || ""}</strong> - 
                        Cédula: ${user.cedula || "N/A"}, Placa: ${user.placaVehiculo || "N/A"}</p>
                        <!-- pasar también el rol al abrir el modal -->
                        <button class="btn-azul-sm" onclick="abrirEditarUsuario('${user.id}','${user.nombre}','${user.apellido}','${user.cedula}','${user.placaVehiculo || ""}','${user.rol || ''}')">Editar</button>
                        <button class="btn-rojo-sm" onclick="eliminarEntidad('${user.id}', '${user.tipo}')">Eliminar</button>
                    </div>
                `;
            });

            if (pagina > 1) {
                paginacion.innerHTML += `<button onclick="listarUsuariosPorRol('${rol}','${listaId}','${paginacionId}', ${pagina - 1})">Anterior</button>`;
            }
            paginacion.innerHTML += ` Página ${pagina} de ${totalPaginas} `;
            if (pagina < totalPaginas) {
                paginacion.innerHTML += `<button onclick="listarUsuariosPorRol('${rol}','${listaId}','${paginacionId}', ${pagina + 1})">Siguiente</button>`;
            }

        } catch (error) {
            console.error("Error:", error);
            lista.innerHTML = "<p>Error al cargar usuarios.</p>";
        }
    }

    // Abrir modal edición
    window.abrirEditarUsuario = function (id, nombre, apellido, cedula, placa, rol) {
        document.getElementById("editUsuarioId").value = id;
        document.getElementById("editNombre").value = nombre;
        document.getElementById("editApellido").value = apellido;
        document.getElementById("editCedula").value = cedula;
        document.getElementById("editPlaca").value = placa;
        // guardar rol como atributo del modal
        const modal = document.getElementById("editarModal");
        if (modal) modal.dataset.rol = rol || "";
        // si existe un input hidden con id="editRol", actualizarlo también
        const editRolInput = document.getElementById("editRol");
        if (editRolInput) editRolInput.value = rol || "";
        if (modal) modal.style.display = "block";
    };

    // Cerrar modal edición
    window.cerrarEditarModal = function () {
        document.getElementById("editarModal").style.display = "none";
    };

    // Guardar cambios edición
    document.getElementById("editarUsuarioForm")?.addEventListener("submit", async function (e) {
        e.preventDefault();

        const id = document.getElementById("editUsuarioId").value;
        const usuarioData = {
            nombre: document.getElementById("editNombre").value,
            apellido: document.getElementById("editApellido").value,
            cedula: document.getElementById("editCedula").value,
            placaVehiculo: document.getElementById("editPlaca").value
        };

        // decidir endpoint según rol almacenado en el modal o input hidden
        const modal = document.getElementById("editarModal");
        const rol = (document.getElementById("editRol")?.value) || (modal?.dataset?.rol) || "";
        const isVisitante = rol === "visitante";
        const url = isVisitante ? `http://localhost:5000/api/visitantes/editarVisitante/${id}` : `http://localhost:5000/api/usuarios/${id}`;

        try {
            const response = await fetch(url, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify(usuarioData)
            });

            const data = await response.json().catch(()=>null);
            if (!response.ok) {
                console.error("Error al editar:", response.status, data);
                return alert("❌ Error al editar: " + (data?.msg || data?.error || data?.mensaje || `HTTP ${response.status}`));
            }

            alert("✅ Usuario/Visitante actualizado");
            cerrarEditarModal();
            // refrescar listas relevantes
            listarUsuariosPorRol("residente","listaResidentes","paginacionResidentes");
            listarUsuariosPorRol("visitante","listaVisitantes","paginacionVisitantes");
            listarUsuariosPorRol("porteria","listaPorteros","paginacionPorteros");
            // si hay vista de residente abierta, recargar visitantes
            if (typeof cargarVisitantes === "function") cargarVisitantes();
        } catch (error) {
            console.error("Error:", error);
            alert("❌ No se pudo actualizar el usuario/visitante");
        }
    });

    // Eliminar usuario
    window.eliminarUsuario = async function (id) {
        if (!confirm("¿Seguro que deseas eliminar este usuario?")) return;
        try {
            const response = await fetch(`http://localhost:5000/api/usuarios/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
            });
            if (!response.ok) throw new Error("Error al eliminar");
            alert("✅ Usuario eliminado");
            listarUsuariosPorRol("residente","listaResidentes","paginacionResidentes");
            listarUsuariosPorRol("visitante","listaVisitantes","paginacionVisitantes");
            listarUsuariosPorRol("porteria","listaPorteros","paginacionPorteros");
        } catch (error) {
            console.error("Error:", error);
            alert("❌ No se pudo eliminar");
        }
    };
// ---------------- ELIMINAR VISITANTE ADMIN/PORTERIA ----------------
window.eliminarVisitanteAdmin = async function (visitanteId) {
    if (!confirm("¿Seguro que deseas eliminar este visitante?")) return;
    try {
        const response = await fetch(`http://localhost:5000/api/visitantes/${visitanteId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        const data = await response.json();
        if (response.ok) {
            alert("✅ Visitante eliminado");
            listarUsuariosPorRol("visitante","listaVisitantes","paginacionVisitantes");
        } else {
            alert("❌ Error: " + (data.msg || data.mensaje || "No se pudo eliminar"));
        }
    } catch (error) {
        console.error("Error al eliminar visitante admin:", error);
    }
};

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
