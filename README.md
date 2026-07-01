# 🛡️ Sistema de Control de Asistencia y Horas Extras

Una aplicación de escritorio de alto rendimiento diseñada para la gestión automatizada de asistencia, control de breaks y cálculo preciso de horas extras para el personal de la institución. Construida con una arquitectura moderna de cliente local seguro distribuidor.

Alias del desarrollador en GitHub: **vimofama**

---

## 🚀 Características Principales

* **Panel de Asistencia en Tiempo Real:** Visualización del estado actual de todos los empleados activos ("No ha ingresado", "Trabajando", "En break", "Salió").
* **Rutina Inteligente de Autocierre:** Algoritmo ejecutado automáticamente en el arranque de la aplicación que detecta jornadas inconclusas de días pasados y las cierra utilizando el horario reglamentario del empleado (`schedule_end`), penalizando breaks abiertos de forma justa.
* **Gestión e Historial Modular:** Buscador avanzado por empleado y fecha mediante `p-autocomplete` de PrimeNG con edición inline controlada por diálogo nativo del S.O.
* **Reportes Estilo Excel:** Generación automática de reportes mensuales de horas extras parametrizables por semanas específicas, cálculo exacto de milisegundos trabajados y exportación directa a formato CSV.
* **Seguridad Criptográfica:** Autenticación de usuarios basada en roles (`ADMIN` / `LOCAL`) con almacenamiento seguro mediante hashes `bcryptjs`.
* **Integración de Sistema Nativo:** Configuración de inicio automático con el sistema operativo (Autostart) controlado por interfaz gráfica y módulo de actualizaciones automáticas (Updater) con firma criptográfica asimétrica.

---

## 🛠️ Stack Tecnológico

* **Frontend:** [Angular v22](https://angular.dev/) (Utilizando arquitectura funcional de *Signals*, Controladores `@Service` inyectables y sintaxis moderna de control de flujo `@if` / `@for`).
* **UI Component Library:** [PrimeNG](https://primeng.org/) (Lara Theme) & [Tailwind CSS](https://tailwindcss.com/) (Diseño fluido y utilitario).
* **Runtime de Escritorio:** [Tauri](https://tauri.app/) (Core en Rust para un empaquetado ultra liviano y seguro sin la sobrecarga de memoria de Electron).
* **Base de Datos:** SQLite integrada de manera local mediante el plugin `@tauri-apps/plugin-sql`.
* **Manejo de Fechas:** `date-fns` (Procesamiento estricto de zonas horarias locales).

---

## 🛠️ Desarrollo e Instalación Local
Prerequisitos:
1. Node.js v20 o superior
2. Rust v1.80 o superior
3. Herramientas de compilación de C++ de Visual Studio (para Windows)


