/* ===========================================================================
   ASOGUANGA — HILANDO EN DUALIDAD
   JavaScript nativo (sin dependencias externas) para mantener el sitio
   ligero, rápido y libre de vulnerabilidades asociadas a librerías de
   terceros. Todo el código se ejecuta de forma defensiva (try/catch) para
   que un fallo puntual nunca bloquee el resto de la página.
   =========================================================================== */

(function () {
  "use strict";

  /* -------------------------------------------------------------------
     Utilidad: ejecuta una función de forma segura, sin romper el resto
     del script si ocurre un error inesperado.
  ------------------------------------------------------------------- */
  function safeRun(fn, label) {
    try {
      fn();
    } catch (err) {
      // Se registra en consola solo para depuración; no se expone al usuario.
      console.error("[AsoGuanga] Error en '" + label + "':", err);
    }
  }

  /* -------------------------------------------------------------------
     1. AÑO DINÁMICO EN EL PIE DE PÁGINA
  ------------------------------------------------------------------- */
  function setCurrentYear() {
    const yearEl = document.getElementById("currentYear");
    if (!yearEl) return;
    yearEl.textContent = String(new Date().getFullYear());
  }

  /* -------------------------------------------------------------------
     2. MENÚ DE NAVEGACIÓN (móvil)
  ------------------------------------------------------------------- */
  function initNavToggle() {
    const toggle = document.getElementById("navToggle");
    const nav = document.getElementById("primaryNav");
    if (!toggle || !nav) return;

    function closeNav() {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    }

    function openNav() {
      nav.classList.add("is-open");
      toggle.setAttribute("aria-expanded", "true");
    }

    toggle.addEventListener("click", function () {
      const isOpen = nav.classList.contains("is-open");
      if (isOpen) {
        closeNav();
      } else {
        openNav();
      }
    });

    // Cierra el menú al seleccionar un enlace (mejor UX en móvil).
    nav.querySelectorAll(".nav-link").forEach(function (link) {
      link.addEventListener("click", closeNav);
    });

    // Cierra el menú si la ventana se agranda a escritorio.
    window.addEventListener("resize", function () {
      if (window.innerWidth >= 860) closeNav();
    });

    // Cierra el menú con la tecla Escape (accesibilidad).
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeNav();
    });
  }

  /* -------------------------------------------------------------------
     3. VALIDACIÓN Y SANITIZACIÓN DEL FORMULARIO DE CONTACTO
     - No se usa innerHTML con datos del usuario en ningún momento.
     - Se recorta longitud, se eliminan etiquetas HTML y caracteres de
       control para mitigar intentos básicos de inyección.
     - Honeypot oculto para descartar envíos automatizados (bots).
  ------------------------------------------------------------------- */

  const FIELD_LIMITS = {
    fullName: 80,
    email: 120,
    subject: 120,
    message: 1000
  };

  // Elimina etiquetas HTML y caracteres de control; recorta espacios.
  function sanitizeInput(value, maxLength) {
    if (typeof value !== "string") return "";
    let clean = value.replace(/<[^>]*>/g, "");
    // eslint-disable-next-line no-control-regex
    clean = clean.replace(/[\u0000-\u001F\u007F]/g, "");
    clean = clean.trim();
    if (maxLength && clean.length > maxLength) {
      clean = clean.slice(0, maxLength);
    }
    return clean;
  }

  function isValidEmail(value) {
    // Validación razonable en frontend; la verificación definitiva
    // siempre debe repetirse en el backend cuando este se implemente.
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(value);
  }

  function showFieldError(fieldId, message) {
    const errorEl = document.getElementById(fieldId + "Error");
    const inputEl = document.getElementById(fieldId);
    if (errorEl) errorEl.textContent = message || "";
    if (inputEl) inputEl.setAttribute("data-touched", "true");
  }

  function validateForm(data) {
    let isValid = true;

    if (!data.fullName || data.fullName.length < 2) {
      showFieldError("fullName", "Ingresa tu nombre completo (mínimo 2 caracteres).");
      isValid = false;
    } else {
      showFieldError("fullName", "");
    }

    if (!data.email || !isValidEmail(data.email)) {
      showFieldError("email", "Ingresa un correo electrónico válido.");
      isValid = false;
    } else {
      showFieldError("email", "");
    }

    if (!data.subject || data.subject.length < 3) {
      showFieldError("subject", "Cuéntanos brevemente el asunto (mínimo 3 caracteres).");
      isValid = false;
    } else {
      showFieldError("subject", "");
    }

    if (!data.message || data.message.length < 10) {
      showFieldError("message", "Tu mensaje debe tener al menos 10 caracteres.");
      isValid = false;
    } else {
      showFieldError("message", "");
    }

    return isValid;
  }

  function initContactForm() {
    const form = document.getElementById("contactForm");
    const statusEl = document.getElementById("formStatus");
    if (!form) return;

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      if (statusEl) {
        statusEl.textContent = "";
        statusEl.removeAttribute("data-state");
      }

      const formData = new FormData(form);

      // Honeypot: si el campo oculto trae contenido, se descarta como bot
      // sin dar pistas específicas al remitente automatizado.
      const honeypot = formData.get("website");
      if (honeypot) {
        if (statusEl) {
          statusEl.textContent = "No fue posible procesar el mensaje.";
          statusEl.setAttribute("data-state", "error");
        }
        return;
      }

      const data = {
        fullName: sanitizeInput(String(formData.get("fullName") || ""), FIELD_LIMITS.fullName),
        email: sanitizeInput(String(formData.get("email") || ""), FIELD_LIMITS.email),
        subject: sanitizeInput(String(formData.get("subject") || ""), FIELD_LIMITS.subject),
        message: sanitizeInput(String(formData.get("message") || ""), FIELD_LIMITS.message)
      };

      const isValid = validateForm(data);

      if (!isValid) {
        if (statusEl) {
          statusEl.textContent = "Revisa los campos marcados antes de continuar.";
          statusEl.setAttribute("data-state", "error");
        }
        return;
      }

      // NOTA PARA INTEGRACIÓN FUTURA:
      // Aquí se debe reemplazar la simulación por una llamada real, por ejemplo:
      // fetch("/api/contacto", { method: "POST", body: JSON.stringify(data), ... })
      // Mientras no exista backend, se confirma la recepción en el propio navegador.
      submitContactForm(data, form, statusEl);
    });

    // Limpia el mensaje de error de un campo apenas el usuario corrige.
    ["fullName", "email", "subject", "message"].forEach(function (fieldId) {
      const el = document.getElementById(fieldId);
      if (!el) return;
      el.addEventListener("input", function () {
        el.setAttribute("data-touched", "false");
        showFieldError(fieldId, "");
      });
    });
  }

  function submitContactForm(data, form, statusEl) {
    // Simulación ligera y no bloqueante de envío (sin librerías externas).
    const submitBtn = form.querySelector(".btn-submit");
    if (submitBtn) submitBtn.setAttribute("disabled", "true");

    window.setTimeout(function () {
      safeRun(function () {
        if (statusEl) {
          statusEl.textContent =
            "Gracias, " + (data.fullName.split(" ")[0] || "") +
            ". Tu mensaje fue registrado; te responderemos pronto.";
          statusEl.setAttribute("data-state", "success");
        }
        form.reset();
        if (submitBtn) submitBtn.removeAttribute("disabled");
      }, "confirmación de envío");
    }, 400);
  }

  /* -------------------------------------------------------------------
     4. REVELADO SUAVE DE SECCIONES AL HACER SCROLL
     Se usa IntersectionObserver (nativo, ligero) con verificación de
     soporte para no afectar a navegadores antiguos ni el rendimiento.
  ------------------------------------------------------------------- */
  function initScrollReveal() {
    if (!("IntersectionObserver" in window)) return;

    const targets = document.querySelectorAll(
      ".about-grid, .gallery-grid, .thread-grid, .contact-grid"
    );
    if (!targets.length) return;

    targets.forEach(function (el) {
      el.style.opacity = "0";
      el.style.transform = "translateY(16px)";
      el.style.transition = "opacity 0.6s ease, transform 0.6s ease";
    });

    const observer = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.style.opacity = "1";
            entry.target.style.transform = "translateY(0)";
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    targets.forEach(function (el) { observer.observe(el); });
  }

  /* -------------------------------------------------------------------
     PUNTO DE ENTRADA
     Cada inicializador corre de forma aislada: si uno falla, los demás
     igual se ejecutan, evitando que un error detenga toda la página.
  ------------------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", function () {
    safeRun(setCurrentYear, "setCurrentYear");
    safeRun(initNavToggle, "initNavToggle");
    safeRun(initContactForm, "initContactForm");
    safeRun(initScrollReveal, "initScrollReveal");
  });
})();
