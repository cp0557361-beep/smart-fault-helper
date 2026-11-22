# Requerimientos — Smart Fault Helper

Documento vivo con las reglas de negocio de la aplicación. Cuando un requerimiento cambie,
actualízalo aquí **en el mismo commit** que el código.

Estado de cada regla:
- ✅ **Implementado**: el código lo cumple.
- ⚠️ **Parcial**: implementado con huecos conocidos (ver nota).
- ❓ **Por confirmar**: deducido del código o del historial, falta que el dueño del producto lo valide.

Fuentes usadas para esta primera versión: `.lovable/plan.md` (1 mar 2026), el historial de commits
y el código actual. Pendiente: agregar los requerimientos acordados por voz/chat fuera del repo.

---

## 1. Visión general

Aplicación para registrar y clasificar fallas en líneas de producción (vocabulario de SMT:
pick-up, soldadura, tombstone, visión, etc.).

Módulos:
| Ruta | Módulo |
|---|---|
| `/dashboard` | Tablero |
| `/reports` | Captura y consulta de reportes de falla (incluye captura por voz) |
| `/admin/areas` | Áreas de planta |
| `/admin/lines` | Líneas de producción y sus equipos |
| `/admin/line-categories` | Categorías de línea |
| `/admin/machine-types` | Plantillas de tipos de equipo (secciones, atributos, secuencias) |
| `/admin/faults` | Catálogo de tipos de falla |
| `/admin/glossary` | Glosario / aprendizaje de términos |
| `/admin/users` | Usuarios y roles |

Backend: Supabase (Postgres + RLS + Edge Function `classify-fault`).

---

## 2. Jerarquía de planta

- **R-2.1** ✅ La planta se organiza en **Área → Línea de producción → Equipo (machine) → Secciones**.
- **R-2.2** ✅ No puede haber dos líneas con el mismo nombre dentro de la misma área.
- **R-2.3** ✅ Una línea puede tener (opcionalmente) una **categoría de línea**.

---

## 3. Plantillas de tipo de equipo (`machine_types`)

- **R-3.1** ✅ Un equipo solo puede agregarse a una línea si su tipo existe en Plantillas
  (el selector solo muestra tipos existentes).
- **R-3.2** ✅ El nombre del tipo es único.
- **R-3.3** ✅ Cada tipo define **secciones** y **atributos** (con tipo de dato, opciones, obligatorio sí/no).
  Al crear un equipo se le copian las secciones y atributos de su plantilla.
- **R-3.4** ✅ Cada tipo define una lista de **secuencias** posibles (ej. `50`, `50-1`, `50-3`).
- **R-3.5** ✅ Un tipo se puede duplicar con todas sus secciones y atributos.
- **R-3.6** ✅ El orden visual de los tipos en Plantillas se cambia arrastrando, y ese orden
  actualiza `sequence_order` y `default_line_order`.
- **R-3.7** ✅ Un tipo nuevo o duplicado se coloca **al final** del orden de plantillas.
- **R-3.8** ❓ Al duplicar un tipo, ¿deben copiarse también sus secuencias? (hoy no se copian).

---

## 4. Orden de equipos dentro de una línea

- **R-4.1** ✅ El orden de un equipo en la línea **no** es "al final": se hereda de la prioridad de su tipo.
- **R-4.2** ✅ Fuente de la prioridad:
  1. Si la línea tiene categoría → el orden del tipo **dentro de esa categoría**
     (`machine_type_line_categories.sequence_order`).
  2. Si no tiene categoría → `machine_types.default_line_order`.
  3. Tipos sin prioridad definida van al final.
- **R-4.3** ✅ Al crear un equipo, la línea completa se re-ordena por prioridad y se re-numera `0, 1, 2…`
  (si faltan posiciones intermedias se compacta; un equipo nunca queda antes de uno con menor prioridad).
- **R-4.4** ✅ Al cambiar el tipo de un equipo existente, la línea se re-ordena.
- **R-4.5** ✅ Se puede re-ordenar manualmente arrastrando equipos dentro de la línea.
- **R-4.6** ❓ Agregar o cambiar el tipo de un equipo **deshace** los ajustes manuales del R-4.5
  (así lo define el plan original). Confirmar que es lo deseado.
- **R-4.7** ⚠️ El plan original pide mostrar `sequence_order` en el formulario del equipo como dato
  informativo (solo lectura). Hoy no se muestra.

> Nota: `.lovable/plan.md` describe `default_line_order` como "única fuente de verdad". Eso quedó
> superado por las categorías de línea (R-4.2). Este documento es la referencia vigente.

---

## 5. Secuencias de equipo

Una **secuencia** identifica una instancia/estación concreta de un tipo de equipo (ej. `50-1`).

- **R-5.1** ✅ Cada equipo tiene **una** secuencia, tomada de la lista de su tipo.
- **R-5.2** ✅ **Una secuencia es única en toda la línea**, sin importar el tipo de equipo.
- **R-5.3** ✅ Si al tipo le queda una sola secuencia libre en la línea, se asigna automáticamente.
- **R-5.4** ✅ Si el tipo tiene varias secuencias libres, el usuario debe elegir una (obligatorio).
- **R-5.5** ✅ Si el tipo ya no tiene secuencias libres en la línea, no se permite agregar el equipo.
- **R-5.6** ✅ Al editar un equipo, siempre conserva su propia secuencia actual como opción válida
  (para no bloquear datos antiguos que ya tengan duplicados).
- **R-5.7** ⚠️ La unicidad solo se valida en la interfaz. Falta una restricción/trigger en la base de datos.
- **R-5.8** ❓ La regla R-5.2 aplica también a tipos con **una sola** secuencia. Confirmar.

---

## 6. Crear equipos desde plantilla de categoría

Al crear una línea con categoría, se ofrece crear de una vez los equipos de esa categoría.

- **R-6.1** ✅ Se muestra la lista de tipos de la categoría, en su orden, todos marcados por defecto.
- **R-6.2** ✅ Se pueden desmarcar tipos que no aplican.
- **R-6.3** ✅ Para tipos con varias secuencias se pueden agregar **instancias extra** (botón `+`)
  y quitarlas (botón `x`). Cada instancia elige su propia secuencia.
- **R-6.4** ✅ Las secuencias elegidas no se pueden repetir en la línea (R-5.2); el selector solo
  ofrece las libres y se valida antes de crear.
- **R-6.5** ⚠️ Las instancias extra se crean con el mismo nombre que la original. ❓ ¿Agregar la
  secuencia al nombre (ej. `Llenadora 50-1`)?
- **R-6.6** ⚠️ La creación no es atómica: si falla a la mitad quedan equipos parciales.

---

## 7. Duplicar línea

- **R-7.1** ✅ Una línea se puede duplicar eligiendo qué equipos copiar.
- **R-7.2** ❓ Reglas de secuencias al duplicar (¿se copian? ¿se piden de nuevo?). Por definir.

---

## 7-bis. Copia selectiva con renombrado y herencia (solicitado, sin diseñar)

Pedido del dueño del producto (22 nov 2026). **Pendiente de definir**: no implementar hasta tener
el contexto general.

- **R-7b.1** ❓ Toda acción de copiar/duplicar (lo más amplio posible) debe mostrar un diálogo para
  **elegir qué conservar** en la copia.
- **R-7b.2** ❓ La copia debe **conservar los atributos** (valores incluidos).
  > Hoy, al duplicar una línea, los equipos copiados reciben la plantilla con valores vacíos
  > (`applyTemplateToMachine(..., {})`): los valores de atributos se pierden.
- **R-7b.3** ❓ **Renombrado en cascada**: al nombrar la copia, el nombre sigue una estructura y los
  nombres de los elementos debajo en la jerarquía se ajustan en consecuencia. Estructura: por definir.
- **R-7b.4** ❓ **Herencia del destino**: al copiar a otra ubicación (ej. una secuencia de *Línea 2*
  a una secuencia de *Underfill* en el área *Backend*), se sugiere agregar a la copia las propiedades
  de la jerarquía superior del destino. Qué propiedades: por definir.
- **R-7b.5** ❓ Requiere una función nueva: copiar un equipo/secuencia suelto a otra línea o área
  (hoy no existe).

---

## 8. Captura y clasificación de fallas

- **R-8.1** ✅ El operador captura fallas en texto o por voz.
- **R-8.2** ✅ La Edge Function `classify-fault` traduce términos coloquiales al catálogo de fallas
  (ej. "no agarra" → *Error de Pick-up*, "poca pasta" → *Insuficiencia de Soldadura*).
- **R-8.3** ❓ Detalle de campos obligatorios del reporte, flujo de aprendizaje del glosario
  y reportes/indicadores del tablero: **pendiente de documentar**.

---

## 9. Usuarios y permisos

- **R-9.1** ✅ Acceso con inicio de sesión; las rutas internas requieren sesión.
- **R-9.2** ✅ Existen roles (`user_roles`); solo administradores modifican catálogos (RLS `is_admin()`).
- **R-9.3** ❓ Qué puede hacer cada rol: pendiente de documentar.

---

## 10. Riesgos técnicos conocidos

- **T-1** Los equipos se ligan a su tipo **por nombre** (`machines.machine_type` es texto), no por id.
  Renombrar un tipo rompe la liga con plantilla, orden y secuencias de los equipos existentes.
- **T-2** Cambiar el tipo de un equipo no le aplica las secciones/atributos de la nueva plantilla.
- **T-3** Las migraciones `2026-02-10_04-55-12_create_machine_type_attributes.sql` y
  `machine_type_attributes_migration.sql` están escritas en una sola línea con `\n` literales y
  empiezan con `--`, por lo que **todo el archivo es un comentario** y no crea nada. Además definen
  esquemas distintos entre sí. Hay que revisar cuál es la buena y limpiar.
- **T-4** `README.md` y `SECURITY.md` son plantillas sin llenar.

---

## Pendientes de incorporar

- [ ] Requerimientos acordados por voz / fuera del repo.
- [ ] Resolver los puntos ❓ de este documento.
