# Prompt: entrevista de levantamiento de requerimientos

Copia todo lo que está dentro del bloque y pégalo como primer mensaje en un chat nuevo de Claude
(sirve también en modo voz). Al terminar, Claude te dará un resumen en Markdown: pégalo en la
sesión de Claude Code del repo para que se integre a `docs/requerimientos.md`.

---

```text
Quiero que me entrevistes para levantar los requerimientos de mi aplicación. Tú haces las preguntas y yo respondo. Al final me entregas un documento con todo lo que te dije, que voy a pasarle a otro asistente que programa la aplicación. Ese asistente no estará en esta conversación, así que el documento debe entenderse solo.

## Contexto de la aplicación

"Smart Fault Helper" es una aplicación web para registrar y clasificar fallas de equipos en líneas de producción de electrónica (vocabulario de SMT: pick-up, pasta de soldadura, puentes, tombstone, visión, underfill, etc.). Ya existe y tiene:

- Jerarquía de planta: Área → Línea de producción → Equipo → Secciones → Atributos.
- Categorías de línea: cada categoría define qué tipos de equipo lleva una línea y en qué orden.
- Plantillas de "tipo de equipo": cada tipo define secciones, atributos (con tipo de dato, opciones y si es obligatorio) y una lista de "secuencias" posibles (ejemplos de formato: 50, 50-1, 50-3).
- Cada equipo en una línea tiene una sola secuencia, y hoy una secuencia no se puede repetir dentro de la misma línea, sea del tipo que sea.
- Copias que ya existen: duplicar línea (eligiendo equipos), duplicar tipo de equipo, duplicar sección, duplicar atributo. Hoy, al duplicar una línea, los valores de los atributos de los equipos NO se copian.
- Captura de fallas por texto y por voz, con clasificación automática de términos coloquiales ("no agarra" → Error de Pick-up).
- Usuarios con roles; solo administradores modifican catálogos.

## Lo que quiero lograr (por eso es la entrevista)

1. Copia selectiva: al copiar cualquier cosa, elegir qué partes conservo en la copia, y que se conserven los atributos con sus valores.
2. Renombrado en cascada: los nombres siguen una estructura; al renombrar la copia, los nombres de lo que está debajo en la jerarquía se ajustan solos.
3. Herencia del destino: si copio algo a otro lugar (por ejemplo, una secuencia de "Línea 2" a una secuencia de "Underfill" ubicada en "Backend"), que se me sugiera agregar a la copia las propiedades de la jerarquía superior del destino.

Todavía no sé cómo debe funcionar en detalle. Tu trabajo es sacarme esa información.

## Cómo debes entrevistarme

- Haz UNA pregunta a la vez, corta y concreta. Puede que esté hablando por voz o en piso de producción.
- Pídeme SIEMPRE ejemplos reales: nombres reales de áreas, líneas, equipos, secuencias, atributos y valores. Un ejemplo real vale más que una definición.
- Si respondo algo ambiguo, repregunta con dos o tres opciones concretas para que elija.
- Si digo "no sé" o "luego lo vemos", anótalo como pendiente y sigue. No me presiones ni inventes la respuesta.
- No propongas soluciones técnicas ni hables de código o bases de datos. Solo entiende cómo funciona mi planta y qué necesito.
- Al terminar cada bloque, hazme un resumen de 3 a 5 líneas y pregúntame si es correcto antes de pasar al siguiente.
- Sigue el orden de los bloques, pero si algo que digo responde un bloque posterior, anótalo ahí y no me lo vuelvas a preguntar.
- Si la entrevista se alarga, pregúntame si quiero pausar y te doy el resumen parcial.

## Bloques de la entrevista

### Bloque 1 — Mapa de la planta
- Qué áreas existen (por ejemplo, ¿"Backend" es un área? ¿Qué otras hay: SMT, Frontend, Final…?).
- Qué líneas tiene cada área y cómo se llaman.
- Qué es exactamente "Underfill": ¿un área, una línea, una categoría de línea, un tipo de equipo, una estación o un paso del proceso?
- Qué es "Línea 2" y a qué área pertenece.
- ¿Falta algún nivel en la jerarquía Área → Línea → Equipo → Sección → Atributo? (por ejemplo: planta, edificio, celda, estación, cabezal, módulo).
- Pídeme que te describa una línea real completa de principio a fin, equipo por equipo.

### Bloque 2 — Secuencias
- Qué significa una "secuencia" en piso: ¿una estación, una posición, una máquina física, un paso del proceso?
- Cómo se forma el código (50, 50-1, 50-3…): qué significa cada parte y quién lo asigna.
- En qué alcance debe ser única una secuencia: ¿en la línea, en el área, en toda la planta, o solo dentro del mismo tipo de equipo?
- Si dos tipos de equipo distintos tienen la misma secuencia única (por ejemplo, ambos solo "50"), ¿pueden convivir en la misma línea?
- Cuando dices "una secuencia de Underfill", ¿te refieres a un equipo de Underfill en una posición concreta?

### Bloque 3 — Nombres (nomenclatura)
- Dame ejemplos reales del nombre completo de cada nivel: área, línea, equipo, sección, atributo.
- ¿Los nombres tienen partes fijas? (prefijos, códigos de área o línea, tipo, número de secuencia, separadores como "-" o "_").
- ¿Qué partes del nombre de un equipo vienen de su línea o área, y cuáles son propias?
- Qué nombres deben ser únicos y dónde (por ejemplo, ¿puede haber dos "Horno" en la misma línea?).
- Cuando renombras la copia, qué debe cambiar en los nombres de abajo. Pídeme un ejemplo "antes → después" de al menos 3 niveles.
- ¿Hay nombres que nunca deben cambiar automáticamente?

### Bloque 4 — Plantillas, secciones y atributos
- Dame 2 o 3 tipos de equipo reales con sus secciones y algunos atributos de ejemplo, con sus valores.
- Qué atributos son iguales para todos los equipos de un tipo (vienen de la plantilla) y cuáles cambian en cada equipo (número de serie, ajustes, etc.).
- ¿Las áreas, líneas o categorías tienen propiedades propias? (por ejemplo, turno, cliente, producto, tipo de underfill, temperatura, programa). Dame ejemplos.
- ¿Alguna propiedad de un nivel superior debería verse o heredarse en los equipos de abajo?

### Bloque 5 — Copias (el bloque más importante)
Para CADA tipo de copia que uses o quieras usar (duplicar línea, copiar un equipo o secuencia a otra línea o área, duplicar tipo de equipo, duplicar sección, duplicar atributo, y cualquier otra que se me ocurra):
- Para qué la usas en la vida real y qué tan seguido.
- Desde dónde y hacia dónde copias.
- Qué partes quieres poder elegir conservar o descartar (equipos, secciones, atributos, valores, número de serie, imágenes, secuencia, orden).
- Qué debe conservarse siempre y qué no debe copiarse nunca (por ejemplo, ¿el número de serie se copia o se deja vacío?).
- Cómo se debe llamar la copia y qué pasa con los nombres de abajo (conecta con el Bloque 3).
- Qué pasa si en el destino ya existe algo con el mismo nombre o la misma secuencia.
- Qué te estorba o te hace perder tiempo hoy al copiar.

Luego, recorre conmigo paso a paso este caso concreto: "copio una secuencia de Línea 2 a una secuencia de Underfill que está en Backend".
- Qué tengo antes, qué elijo, qué escribo y qué espero ver al final.
- Qué "propiedades de la jerarquía superior" del destino se deberían sugerir: ¿atributos que la plantilla del destino tiene y la copia no? ¿datos del área o la línea destino? ¿valores que usan otros equipos del destino? ¿otra cosa? Pídeme ejemplos con nombres y valores.
- Si una propiedad del origen choca con una del destino, cuál gana o si se me pregunta.

### Bloque 6 — Orden de los equipos en la línea
- Hoy el orden de un equipo se hereda del orden de su tipo en la categoría de la línea. Si acomodo el orden a mano y luego agrego otro equipo, el orden manual se pierde y se re-acomoda. ¿Es correcto o el orden manual debe respetarse?
- Al copiar equipos a otra línea, ¿conservan el orden del origen o toman el del destino?

### Bloque 7 — Dudas pendientes que ya tengo anotadas
Pregúntame cada una por separado:
1. Al duplicar un tipo de equipo, ¿se copian también sus secuencias? (hoy no se copian).
2. Al crear varios equipos del mismo tipo desde plantilla, hoy se llaman igual. ¿Se les agrega la secuencia al nombre? (por ejemplo, "Dispensador 50-1").
3. Al duplicar una línea, ¿qué pasa con las secuencias: se copian iguales, se piden de nuevo, o se ajustan?
4. Al cambiarle el tipo a un equipo existente, ¿se le deben poner las secciones y atributos de la plantilla del nuevo tipo? ¿Qué pasa con los valores que ya tenía?
5. Si renombro un tipo de equipo en Plantillas, ¿los equipos existentes de ese tipo deben actualizarse solos?

### Bloque 8 — Fallas, reportes y usuarios (breve)
- Qué datos debe tener un reporte de falla y cuáles son obligatorios.
- Quién captura fallas y desde dónde (celular en piso, computadora…).
- Qué indicadores o reportes necesitas ver en el tablero.
- Qué roles existen y qué puede hacer cada uno.

### Bloque 9 — Prioridades
- De todo lo que hablamos, ¿qué es lo más urgente? Ordena las 5 cosas principales.
- ¿Hay alguna fecha o evento límite?

## Documento final que debes entregarme

Cuando terminemos (o si pido pausar), entrégame UN solo bloque en Markdown, listo para copiar, con esta estructura exacta:

# Levantamiento de requerimientos — <fecha>

## 1. Glosario
Tabla | Término | Qué significa en esta planta | Ejemplo real |. Incluye como mínimo: área, línea, categoría de línea, tipo de equipo, equipo, sección, atributo, secuencia, Backend, Underfill, Línea 2.

## 2. Mapa de la planta
Jerarquía con nombres reales, en forma de árbol de texto, por ejemplo:
- Área Backend
  - Línea UF-1 (categoría: Underfill)
    - 50-1 Dispensador …

## 3. Reglas de secuencias
## 4. Reglas de nomenclatura
Incluye el patrón de nombre de cada nivel con sus partes y ejemplos "antes → después" del renombrado en cascada.
## 5. Plantillas, secciones y atributos
Separa los atributos de plantilla de los atributos propios de cada equipo; incluye las propiedades de área, línea o categoría si existen.
## 6. Copias
Una subsección por cada tipo de copia, con: propósito, origen → destino, qué se puede elegir, qué se conserva siempre, qué nunca se copia, nombres, conflictos y herencia del destino. Incluye el caso "Línea 2 → Underfill en Backend" paso a paso.
## 7. Orden de equipos
## 8. Respuestas a las dudas pendientes
Numeradas igual que en el Bloque 7.
## 9. Fallas, reportes y usuarios
## 10. Prioridades
## 11. Pendientes y "no sé"
Todo lo que quedó sin responder, para preguntarlo después.

Reglas del documento:
- Escribe cada regla como una frase corta y verificable ("Una secuencia no se repite dentro de la misma línea").
- Usa mis palabras y mis ejemplos reales; no inventes nombres ni valores.
- Si algo lo deduces tú y yo no lo confirmé, márcalo con "(por confirmar)".
- No incluyas recomendaciones técnicas.

Empieza presentándote en una línea, dime cuántos bloques son y cuánto tiempo aproximado tomará, y hazme la primera pregunta del Bloque 1.
```
