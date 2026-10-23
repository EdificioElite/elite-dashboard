# Referencia: Contadores Kamstrup Multical 403 + Datalogger Elvaco CMe3100

> Documentación de referencia sobre los dos equipos de terceros que emiten y
> transportan las lecturas de consumo térmico de Edificio Elite. Sirve para
> entender el formato del CSV que ingiere el dashboard y para mantener el mock
> del datalogger en dev.
>
> Equipos:
> - **Datalogger / gateway:** Elvaco CMe3100 (M-Bus Metering Gateway).
> - **Contadores:** Kamstrup Multical 403 (contador de energía térmica por ultrasonidos, calor/frío).
>
> Fuentes: documentación oficial de Elvaco (Integrator's Manual for CMe products:
> "Reference information", "HTTP Report Templates") y Technical Description de
> Kamstrup Multical 403.

---

## 1. Elvaco CMe3100 (datalogger)

### Qué es

Gateway de lectura remota de contadores M-Bus. Lee los contadores conectados al
bus M-Bus y compila los datos en **informes (reports)** que envía de forma
programada por HTTP POST, FTP, MQTT o e-mail (MQTT solo en CMe3100).

- Lee hasta 32 esclavos M-Bus directos; más con repetidores.
- Nº de serie de 10 dígitos; los 4 primeros identifican el producto (`0016` = CMe3100).
  El datalogger de Edificio Elite es `0016045167`.

### Cómo emite los datos

El CMe3100 ejecuta un **report template** de forma programada y hace un
`HTTP POST` a una URL configurada (`qset http`), con **Basic Auth**.

- El report de Edificio Elite es el **template 3115**: *"HTTP value report extended
  plus with position (MOID) and primary address"* (valores en un único POST, en
  formato decodificado/legible, con `device-position` y `primary-address`).
- El `filename` del header lo confirma: `0016045167_valuereport_20261001202556_3115.csv`.

### Headers relevantes del POST

| Header | Valor observado | Notas |
|---|---|---|
| `User-Agent` | `Model/CMe3100 Hardware/R1E Serial/0016045167 Application/1.15.0 MAC/00:D0:93:71:BD:4C` | Identifica el producto. |
| `Content-Type` | `application/octet-stream` | Elvaco lo trata como **texto en ISO-8859-1**. |
| `Authorization` | `Basic <base64(user:pass)>` | Credenciales fijas configuradas en el CMe3100. |
| `filename` | `<serial>_valuereport_<time>_<report-id>.csv` | `time` = `YYYYMMDDHHMMSS`. |
| `Content-Length` | ~89 KB | El POST se genera en runtime (chunked); la longitud varía. |

### Formato del CSV (template 3115)

El body es un CSV con delimitador `;`. Contiene **una línea de cabecera por
contador, seguida de una o varias líneas de valores**, y esta estructura se repite
por cada contador (por eso aparecen líneas de cabecera repetidas intercaladas).

Columnas fijas al inicio de cada fila de datos:

| # | Columna | Descripción |
|---|---|---|
| 0 | `#serial-number` | Nº de serie del datalogger (CMe3100). |
| 1 | `device-position` | Posición/ubicación lógica del contador (MOID), p.ej. `0A`, `1A`. |
| 2 | `primary-address` | Dirección M-Bus primaria del contador. |
| 3 | `device-identification` | Dirección secundaria M-Bus (ID único de 8 dígitos del contador). |
| 4 | `created` | Fecha/hora de la lectura según el datalogger (`YYYY-MM-DD hh:mm:ss`). |
| 5 | `value-data-count` | Nº de telegrama M-Bus del que procede el valor (0 = primer telegrama, 1 = segundo, …). |
| 6 | `manufacturer` | Código de fabricante del contador (p.ej. `KAM` = Kamstrup). |
| 7 | `version` | Versión M-Bus del dispositivo. |
| 8 | `device-type` | Tipo de dispositivo (`heat/cooling load`). |
| 9 | `access-number` | Se incrementa en cada petición al contador (sirve para detectar otro master). |
| 10 | `status` | Campo de estado M-Bus. |
| 11 | `signature` | Firma del dispositivo. |
| 12..n | `<value-description>` | Una columna por cada valor M-Bus decodificado (ver abajo). |

### Value-description (6 campos separados por coma)

Cada columna de valor describe exactamente su significado con 6 campos:

```
<description>,<unit>,<function>,<tariff>,<sub-unit>,<storage-number>
```

Ejemplos del CSV real:

| Cabecera | description | unit | function | tariff | sub-unit | storage |
|---|---|---|---|---|---|---|
| `energy,Wh,inst-value,0,0,0` | energy | Wh | inst-value | 0 | 0 | 0 |
| `energy manufacturer-specific-02,Wh,inst-value,0,0,0` | energy manufacturer-specific-02 | Wh | inst-value | 0 | 0 | 0 |
| `volume,m3,inst-value,0,1,0` | volume | m3 | inst-value | 0 | 1 | 0 |
| `volume,m3,inst-value,0,0,1` | volume | m3 | inst-value | 0 | 0 | 1 |
| `flow-temp,°C,inst-value,0,0,0` | flow-temp | °C | inst-value | 0 | 0 | 0 |
| `datetime,,inst-value,0,0,0` | datetime | (vacío) | inst-value | 0 | 0 | 0 |
| `power,W,max-value,0,0,1` | power | W | max-value | 0 | 0 | 1 |
| `on-time,hour(s),err-value,0,0,0` | on-time | hour(s) | err-value | 0 | 0 | 0 |

- **`function`** puede ser: `inst-value` (valor actual), `max-value` (máximo),
  `min-value` (mínimo), `err-value` (error, no tratar como valor válido).
- **`storage-number`** (último dígito) distingue el registro actual (`0`) del
  histórico/referencia (`1`).
- **`sub-unit`** (penúltimo dígito) distingue registros casi idénticos; p.ej. en el
  Multical 403, `volume` sub-unit 0/1/2 son registros distintos (ACS, agua fría…).
- El espacio en descripciones se sustituye por `-` (`flow-temp`); las combinaciones
  de descripción se separan con espacio (`energy manufacturer-specific-02`).

### Campos con significado especial

- **`created`** — timestamp de la lectura según el **datalogger**. El CMe3100 puede
  configurar un offset UTC, pero n8n lo trataba como hora UTC directamente (ver §3).
- **`value-data-count`** — telegrama M-Bus del que se extrajo el valor (0, 1, …).
- **`access-number`** — incrementa en cada petición; útil para detectar si otro
  master M-Bus lee el contador.
- **`device-identification`** — dirección secundaria M-Bus (8 dígitos), el ID único
  que vincula contador ↔ vecino en `vecinos.device_identification`.

### Encoding

`Content-Type: application/octet-stream` se trata como **ISO-8859-1 (latin1)**.
El carácter de grado `°` (0xB0) es válido en latin1; decodificar como UTF-8 lo
corrompe a `�` (U+FFFD). Por eso la implementación debe decodificar el body en
**latin1**, no UTF-8.

### Reenvío / retries

El CMe3100 reenvía los últimos ~15 min de lecturas en cada report (retry/schedule).
Esto hace que el ingestor deba ser **idempotente** (upsert), porque llegan lecturas
ya vistas.

---

## 2. Kamstrup Multical 403 (contador)

### Qué es

Contador de energía térmica estático por ultrasonidos para calor, frío o
combinado calor/frío. Mide energía (Wh), volumen (m³), temperaturas de impulsión y
retorno, diferencia de temperatura, potencia (W) y caudal (m³/h).

### Registros M-Bus expuestos

Cada lectura expone valores del registro actual (**storage 0**, sufijo `0,0,0`) y
del registro de referencia/inicio de periodo (**storage 1**, sufijo `0,0,1`).

| Campo CSV | Columna BD (dashboard) | Significado |
|---|---|---|
| `energy,Wh,inst-value,0,0,0` | `energy_wh_inst_value_0_0_0` | Energía de **calor** acumulada (Wh). |
| `energy manufacturer-specific-02,Wh,inst-value,0,0,0` | `energy_manufacturer_specific_02_wh_inst_value_0_0_0` | Energía de **frío** acumulada (Wh). |
| `volume,m3,inst-value,0,0,0` | `volume_m3_inst_value_0_0_0` | Volumen registro 0 (m³). |
| `volume,m3,inst-value,0,1,0` | `volume_m3_inst_value_0_1_0` | Volumen sub-unit 1 = **ACS** (m³). |
| `volume,m3,inst-value,0,2,0` | `volume_m3_inst_value_0_2_0` | Volumen sub-unit 2 (m³). |
| `flow-temp,°C,inst-value,0,0,0` | `flow_temp_c_inst_value_0_0_0` | Temperatura de **impulsión** (°C). |
| `return-temp,°C,inst-value,0,0,0` | `return_temp_c_inst_value_0_0_0` | Temperatura de **retorno** (°C). |
| `diff-temp,K,inst-value,0,0,0` | `diff_temp_k_inst_value_0_0_0` | Salto térmico (K). |
| `power,W,inst-value,0,0,0` | `power_w_inst_value_0_0_0` | Potencia instantánea (W). |
| `volume-flow,m3/h,inst-value,0,0,0` | `volume_flow_m3h_inst_value_0_0_0` | Caudal instantáneo (m³/h). |
| `on-time,hour(s),inst-value,0,0,0` | `on_time_hours_inst_value_0_0_0` | Horas de funcionamiento. |
| `on-time,hour(s),err-value,0,0,0` | `on_time_hours_err_value_0_0_0` | Horas en error. |
| `datetime,,inst-value,0,0,0` | `datetime_inst_value_0_0_0` | **Reloj interno del contador** ("Date and time record"). |
| `date,,inst-value,0,0,1` | `date_inst_value_0_0_1` | Fecha de referencia (target date, storage 1). |
| `fabrication-no,,inst-value,0,0,0` | `fabrication_no_inst_value_0_0_0` | Nº de fabricación. |
| `manufacturer-specific-ff-07/08/16/17/1a/22` | `manufacturer_specific_ff_*` | Registros propietarios de Kamstrup (ver abajo). |
| (los `...,0,0,1`) | `..._0_0_1` | Valores del registro de referencia (inicio de periodo). |

### `datetime` vs `created` (clave para detectar contadores congelados)

- `created` es el reloj del **datalogger**; avanza siempre que el CMe3100 sondea.
- `datetime` es el reloj del **contador**; avanza en paralelo a `created` (con un
  offset aproximadamente constante por contador, en la muestra ~37-56 min).
- Si un contador deja de actualizarse, `datetime` se congela mientras `created`
  sigue avanzando → `created - datetime` crece sin límite. Ese es el criterio de
  "contador desactualizado".

### Campos manufacturer-specific (Kamstrup)

Registros propietarios identificados por VIF `0xFF07`, `0xFF08`, `0xFF16`,
`0xFF17`, `0xFF1A` y `0xFF22`. Observado en la muestra:

- `ff-07` / `ff-08`: contadores acumulativos (varían entre lecturas).
- `ff-1a` / `ff-16` / `ff-17`: aparentemente constantes (configuración/versión).

El dashboard los persiste pero **no los usa** para los cálculos de consumo. Su
significado exacto está en la Technical Description de Kamstrup Multical 403.

---

## 3. Transformaciones aplicadas por n8n (a replicar)

El workflow `Lectura Contadores` de n8n transformaba el CSV antes de insertar en
`contadores`. Estas reglas se deben replicar exactamente para mantener la paridad:

| Campo | Transformación n8n |
|---|---|
| `created` | `new Date(created.replace(' ','T') + 'Z').toISOString()` — trata la hora del datalogger como **UTC** (quirk: no aplica el offset real Europe/Madrid). |
| `volume_m3_*` | `Number(valor.replace(',','.')) / 10` (coma→punto, dividir entre 10). |
| `volume_flow_m3h_*` | `Number(valor.replace(',','.')) / 10`. |
| `flow_temp` / `return_temp` / `diff_temp` | `Number(valor.replace(',','.'))`. |
| `energy_manufacturer_specific_02_wh_inst_value_0_0_0` | `Number(valor)`. |
| resto | string crudo (Postgres castea al tipo de columna). |

Campos del CSV que n8n **no inserta**: `power,W,max-value,0,0,0` y
`volume-flow,m3/h,max-value,0,0,0`.

---

## 4. Implicaciones para la integración

- **Encoding:** decodificar el body como **latin1** (ISO-8859-1).
- **Idempotencia:** upsert por `(serial_number, device_identification, created)`
  porque el CMe3100 reenvía los últimos minutos.
- **`created` como UTC:** replicar el quirk de n8n para que los `created` coincidan
  con los ya existentes (evita duplicados en el upsert).
- **Detección de integridad:**
  - *Faltante*: contador esperado (`vecinos`) que no aparece en el CSV.
  - *Desactualizado*: `created - datetime > umbral` (reloj del contador congelado).
- **Mock en dev:** generar un CSV con la misma estructura (cabecera por contador +
  ~4 lecturas, 40 contadores) y POSTearlo al endpoint de ingesta.
