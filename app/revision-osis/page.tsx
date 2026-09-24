"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Download,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  X,
  Sparkles,
  ChevronRight,
} from "lucide-react";

interface OsiRecord {
  id: number;
  nro_osi_secuencial: string;
  id_estatus: number;
  estatus_actual: string;
  created_at: string;
  fecha_emision: string | null;
  fecha_inicio_real: string | null;
  fecha_fin_real: string | null;
  status_changed_at: string | null;
  updated_at: string | null;
  id_ecc: number;
  id_trato: number;
  id_presupuesto: number;
  nro_presupuesto: number;
  empresa: string;
  servicio: string;
}

const RAW_OSI_DATA: OsiRecord[] = [
  {
    id: 330,
    nro_osi_secuencial: "PEN-3552",
    id_estatus: 10,
    estatus_actual: "Pendiente",
    created_at: "2026-09-23 20:17:54.637555+00",
    fecha_emision: null,
    fecha_inicio_real: "2026-10-05",
    fecha_fin_real: "2026-10-05",
    status_changed_at: "2026-09-23 20:17:54.637555+00",
    updated_at: "2026-09-23 20:17:55.293098+00",
    id_ecc: 1680,
    id_trato: 985,
    id_presupuesto: 1066,
    nro_presupuesto: 21250,
    empresa: "CONSORCIO DE COGESTION VENEQUIP",
    servicio: "MANEJO DE MONTACARGAS"
  },
  {
    id: 329,
    nro_osi_secuencial: "3551",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-09-23 20:01:21.601558+00",
    fecha_emision: "2026-09-23 20:13:07.047+00",
    fecha_inicio_real: "2026-09-24",
    fecha_fin_real: "2026-09-24",
    status_changed_at: "2026-09-24 07:06:24.484+00",
    updated_at: "2026-09-24 07:06:24.548119+00",
    id_ecc: 1801,
    id_trato: 1051,
    id_presupuesto: 1128,
    nro_presupuesto: 21312,
    empresa: "SHA DE VENEZUELA",
    servicio: "PERMISO DE TRABAJO"
  },
  {
    id: 328,
    nro_osi_secuencial: "3552",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-09-23 19:20:01.706488+00",
    fecha_emision: "2026-09-24 13:14:03.042+00",
    fecha_inicio_real: "2026-09-24",
    fecha_fin_real: "2026-09-24",
    status_changed_at: "2026-09-24 14:18:01.772+00",
    updated_at: "2026-09-24 14:14:33.996477+00",
    id_ecc: 1780,
    id_trato: 1040,
    id_presupuesto: 1115,
    nro_presupuesto: 21299,
    empresa: "HIGH CLEAN SERVICES 47 C A",
    servicio: "PERMISO DE TRABAJO"
  },
  {
    id: 327,
    nro_osi_secuencial: "3550",
    id_estatus: 11,
    estatus_actual: "En Proceso",
    created_at: "2026-09-23 13:34:01.431365+00",
    fecha_emision: "2026-09-23 14:46:08.569+00",
    fecha_inicio_real: "2026-09-26",
    fecha_fin_real: "2026-10-04",
    status_changed_at: "2026-09-23 14:46:08.6329+00",
    updated_at: "2026-09-23 14:46:09.849841+00",
    id_ecc: 1721,
    id_trato: 1009,
    id_presupuesto: 1082,
    nro_presupuesto: 21266,
    empresa: "SERVICIOS Y DISTRIBUCIONES DEL SUR  C A (SERDISURCA)",
    servicio: "EXCELENCIA OPERACIONAL"
  },
  {
    id: 326,
    nro_osi_secuencial: "3549",
    id_estatus: 11,
    estatus_actual: "En Proceso",
    created_at: "2026-09-23 12:36:19.118308+00",
    fecha_emision: "2026-09-23 13:21:50.441+00",
    fecha_inicio_real: "2026-09-24",
    fecha_fin_real: "2026-09-25",
    status_changed_at: "2026-09-24 07:06:24.554+00",
    updated_at: "2026-09-24 07:06:24.803072+00",
    id_ecc: 1713,
    id_trato: 1005,
    id_presupuesto: 1076,
    nro_presupuesto: 21260,
    empresa: "GARNER DE VENEZUELA, S.A",
    servicio: "EXCELENCIA OPERACIONAL"
  },
  {
    id: 325,
    nro_osi_secuencial: "3548",
    id_estatus: 11,
    estatus_actual: "En Proceso",
    created_at: "2026-09-22 18:55:08.64562+00",
    fecha_emision: "2026-09-22 19:49:34.621+00",
    fecha_inicio_real: "2026-09-24",
    fecha_fin_real: "2026-09-25",
    status_changed_at: "2026-09-24 07:06:24.525+00",
    updated_at: "2026-09-24 07:06:24.812764+00",
    id_ecc: 1697,
    id_trato: 993,
    id_presupuesto: 1056,
    nro_presupuesto: 21240,
    empresa: "MUNDO MARINO R.S, C.A",
    servicio: "EXCELENCIA OPERACIONAL"
  },
  {
    id: 324,
    nro_osi_secuencial: "3547",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-09-22 18:27:05.410106+00",
    fecha_emision: "2026-09-22 18:28:14.799+00",
    fecha_inicio_real: "2026-09-24",
    fecha_fin_real: "2026-09-24",
    status_changed_at: "2026-09-24 07:06:25.103+00",
    updated_at: "2026-09-24 07:06:25.160113+00",
    id_ecc: 1731,
    id_trato: 1015,
    id_presupuesto: 1090,
    nro_presupuesto: 21274,
    empresa: "OXIALQUILADOS VENEZOLANOS, C.A.",
    servicio: "PERMISO DE TRABAJO"
  },
  {
    id: 323,
    nro_osi_secuencial: "3546",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-09-22 18:14:15.833502+00",
    fecha_emision: "2026-09-22 18:22:23.683+00",
    fecha_inicio_real: "2026-09-24",
    fecha_fin_real: "2026-09-24",
    status_changed_at: "2026-09-24 07:06:24.652+00",
    updated_at: "2026-09-24 07:06:24.902296+00",
    id_ecc: 1723,
    id_trato: 1011,
    id_presupuesto: 1077,
    nro_presupuesto: 21261,
    empresa: "QUIMAINCA",
    servicio: "PERMISO DE TRABAJO"
  },
  {
    id: 322,
    nro_osi_secuencial: "3545",
    id_estatus: 11,
    estatus_actual: "En Proceso",
    created_at: "2026-09-22 15:37:58.950467+00",
    fecha_emision: "2026-09-22 17:20:36.861+00",
    fecha_inicio_real: "2026-09-25",
    fecha_fin_real: "2026-09-25",
    status_changed_at: "2026-09-22 17:20:36.920073+00",
    updated_at: "2026-09-22 17:20:37.950852+00",
    id_ecc: 1712,
    id_trato: 1004,
    id_presupuesto: 1079,
    nro_presupuesto: 21263,
    empresa: "BIOLOGICOS, FARMACEUTICOS Y NATURALES, BIOFINA, C.A.",
    servicio: "MANEJO SEGURO DE MATERIALES PELIGROSOS"
  },
  {
    id: 321,
    nro_osi_secuencial: "3544",
    id_estatus: 11,
    estatus_actual: "En Proceso",
    created_at: "2026-09-21 20:48:11.431088+00",
    fecha_emision: "2026-09-22 12:41:31.05+00",
    fecha_inicio_real: "2026-09-24",
    fecha_fin_real: "2026-09-25",
    status_changed_at: "2026-09-24 07:06:24.669+00",
    updated_at: "2026-09-24 07:06:24.738072+00",
    id_ecc: 1722,
    id_trato: 1010,
    id_presupuesto: 1072,
    nro_presupuesto: 21256,
    empresa: "DRAPCOM, C.A",
    servicio: "EXCELENCIA OPERACIONAL"
  },
  {
    id: 320,
    nro_osi_secuencial: "3536",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-09-21 16:49:04.744942+00",
    fecha_emision: "2026-09-21 17:20:38.891+00",
    fecha_inicio_real: "2026-09-24",
    fecha_fin_real: "2026-09-24",
    status_changed_at: "2026-09-24 07:06:26.516993+00",
    updated_at: "2026-09-24 07:06:26.516993+00",
    id_ecc: 1760,
    id_trato: 1031,
    id_presupuesto: 1093,
    nro_presupuesto: 21277,
    empresa: "COCA COLA FEMSA DE VENEZUELA, S.A",
    servicio: "TRABAJO EN ALTURAS"
  },
  {
    id: 319,
    nro_osi_secuencial: "3542",
    id_estatus: 11,
    estatus_actual: "En Proceso",
    created_at: "2026-09-21 16:46:41.706922+00",
    fecha_emision: "2026-09-21 17:43:00.702+00",
    fecha_inicio_real: "2026-09-25",
    fecha_fin_real: "2026-09-25",
    status_changed_at: "2026-09-21 17:43:00.776455+00",
    updated_at: "2026-09-21 19:43:13.094156+00",
    id_ecc: 1759,
    id_trato: 1031,
    id_presupuesto: 1092,
    nro_presupuesto: 21276,
    empresa: "COCA COLA FEMSA DE VENEZUELA, S.A",
    servicio: "SEGURIDAD EN ALMACÉN"
  },
  {
    id: 318,
    nro_osi_secuencial: "3543",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-09-21 16:03:23.830665+00",
    fecha_emision: "2026-09-21 17:48:40.52+00",
    fecha_inicio_real: "2026-09-24",
    fecha_fin_real: "2026-09-24",
    status_changed_at: "2026-09-24 07:06:24.882+00",
    updated_at: "2026-09-24 07:06:24.941863+00",
    id_ecc: 1705,
    id_trato: 1000,
    id_presupuesto: 1074,
    nro_presupuesto: 21258,
    empresa: "CORPORACION ARCHIVOS MOVILES ARCHIMOVIL, C. A.",
    servicio: "MANEJO SEGURO DE MATERIALES PELIGROSOS"
  },
  {
    id: 317,
    nro_osi_secuencial: "3541",
    id_estatus: 11,
    estatus_actual: "En Proceso",
    created_at: "2026-09-21 15:12:33.117407+00",
    fecha_emision: "2026-09-21 16:05:55.948+00",
    fecha_inicio_real: "2026-06-11",
    fecha_fin_real: "2026-10-25",
    status_changed_at: "2026-09-23 20:21:27.579+00",
    updated_at: "2026-09-23 20:21:27.64195+00",
    id_ecc: 451,
    id_trato: 255,
    id_presupuesto: 255,
    nro_presupuesto: 20395,
    empresa: "COCA COLA FEMSA DE VENEZUELA, S.A",
    servicio: "PERMISO DE TRABAJO"
  },
  {
    id: 316,
    nro_osi_secuencial: "3540",
    id_estatus: 11,
    estatus_actual: "En Proceso",
    created_at: "2026-09-21 14:07:54.237356+00",
    fecha_emision: "2026-09-21 15:09:19.709+00",
    fecha_inicio_real: "2026-09-26",
    fecha_fin_real: "2026-09-26",
    status_changed_at: "2026-09-21 15:09:19.800971+00",
    updated_at: "2026-09-21 15:09:21.928063+00",
    id_ecc: 1703,
    id_trato: 998,
    id_presupuesto: 1064,
    nro_presupuesto: 21248,
    empresa: "PROYECTOS OCAS, C.A",
    servicio: "MANEJO SEGURO DE MATERIALES PELIGROSOS"
  },
  {
    id: 315,
    nro_osi_secuencial: "3538",
    id_estatus: 11,
    estatus_actual: "En Proceso",
    created_at: "2026-09-20 23:48:33.189645+00",
    fecha_emision: "2026-09-21 17:15:51.604+00",
    fecha_inicio_real: "2026-09-25",
    fecha_fin_real: "2026-09-25",
    status_changed_at: "2026-09-21 17:15:51.686813+00",
    updated_at: "2026-09-21 19:36:29.647314+00",
    id_ecc: 1411,
    id_trato: 847,
    id_presupuesto: 860,
    nro_presupuesto: 21044,
    empresa: "COCA COLA FEMSA DE VENEZUELA, S.A",
    servicio: "BLOQUEO Y ETIQUETADO LOTO (LOTO-LOCK OUT TAG OUT)"
  },
  {
    id: 314,
    nro_osi_secuencial: "3537",
    id_estatus: 11,
    estatus_actual: "En Proceso",
    created_at: "2026-09-20 23:45:35.824811+00",
    fecha_emision: "2026-09-21 17:31:03.789+00",
    fecha_inicio_real: "2026-09-26",
    fecha_fin_real: "2026-09-26",
    status_changed_at: "2026-09-21 17:31:04.094388+00",
    updated_at: "2026-09-21 17:31:05.074482+00",
    id_ecc: 1244,
    id_trato: 758,
    id_presupuesto: 818,
    nro_presupuesto: 21002,
    empresa: "COCA COLA FEMSA DE VENEZUELA, S.A",
    servicio: "MANEJO DEFENSIVO PARA MOTOCICLETAS"
  },
  {
    id: 313,
    nro_osi_secuencial: "3539",
    id_estatus: 11,
    estatus_actual: "En Proceso",
    created_at: "2026-09-20 23:42:55.111413+00",
    fecha_emision: "2026-09-21 17:39:21.855+00",
    fecha_inicio_real: "2026-09-26",
    fecha_fin_real: "2026-09-26",
    status_changed_at: "2026-09-21 17:39:22.117526+00",
    updated_at: "2026-09-21 17:39:22.880456+00",
    id_ecc: 943,
    id_trato: 570,
    id_presupuesto: 581,
    nro_presupuesto: 20779,
    empresa: "COCA COLA FEMSA DE VENEZUELA, S.A",
    servicio: "PERMISO DE TRABAJO"
  },
  {
    id: 312,
    nro_osi_secuencial: "3533",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-09-18 15:43:06.423191+00",
    fecha_emision: "2026-09-18 17:37:09.429+00",
    fecha_inicio_real: "2026-09-17",
    fecha_fin_real: "2026-09-18",
    status_changed_at: "2026-09-18 18:02:34.757+00",
    updated_at: "2026-09-18 18:02:35.035479+00",
    id_ecc: 1685,
    id_trato: 987,
    id_presupuesto: 1054,
    nro_presupuesto: 21238,
    empresa: "INGENIERIA SERVICIOS Y SOLDADURAS ISMESOL, C.A.",
    servicio: "EXCELENCIA OPERACIONAL"
  },
  {
    id: 311,
    nro_osi_secuencial: "3534",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-09-18 15:30:29.955373+00",
    fecha_emision: "2026-09-18 18:04:17.648+00",
    fecha_inicio_real: "2026-09-21",
    fecha_fin_real: "2026-09-21",
    status_changed_at: "2026-09-23 21:16:24.449+00",
    updated_at: "2026-09-23 21:16:24.75634+00",
    id_ecc: 1398,
    id_trato: 841,
    id_presupuesto: 873,
    nro_presupuesto: 21057,
    empresa: "COCA COLA FEMSA DE VENEZUELA, S.A",
    servicio: "IDENTIFICACION DE RIESGOS"
  },
  {
    id: 310,
    nro_osi_secuencial: "3532",
    id_estatus: 11,
    estatus_actual: "En Proceso",
    created_at: "2026-09-18 14:36:09.067957+00",
    fecha_emision: "2026-09-18 14:42:44.703+00",
    fecha_inicio_real: "2026-09-21",
    fecha_fin_real: "2026-09-21",
    status_changed_at: "2026-09-18 14:42:44.768243+00",
    updated_at: "2026-09-18 15:06:43.143084+00",
    id_ecc: 1549,
    id_trato: 917,
    id_presupuesto: 987,
    nro_presupuesto: 21171,
    empresa: "CERVECERIA POLAR, C.A. BARCELONA",
    servicio: "EVALUACIÓN ERGONOMICA POR PUESTO DE TRABAJO CON ANTROPOMETRÍA"
  },
  {
    id: 309,
    nro_osi_secuencial: "3531",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-09-18 13:33:24.234369+00",
    fecha_emision: "2026-09-18 13:35:49.363+00",
    fecha_inicio_real: "2026-09-17",
    fecha_fin_real: "2026-09-18",
    status_changed_at: "2026-09-18 18:02:35.043+00",
    updated_at: "2026-09-18 18:02:35.323677+00",
    id_ecc: 1734,
    id_trato: 1017,
    id_presupuesto: 1085,
    nro_presupuesto: 21269,
    empresa: "LEAK REPAIRS VENEZUELA, C.A",
    servicio: "EXCELENCIA OPERACIONAL"
  },
  {
    id: 308,
    nro_osi_secuencial: "3535",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-09-17 22:53:20.272695+00",
    fecha_emision: "2026-09-18 18:23:54.942+00",
    fecha_inicio_real: "2026-09-21",
    fecha_fin_real: "2026-09-21",
    status_changed_at: "2026-09-22 00:55:11.477+00",
    updated_at: "2026-09-22 00:55:11.823136+00",
    id_ecc: 1399,
    id_trato: 842,
    id_presupuesto: 874,
    nro_presupuesto: 21058,
    empresa: "COCA COLA FEMSA DE VENEZUELA, S.A",
    servicio: "IDENTIFICACION DE RIESGOS"
  },
  {
    id: 307,
    nro_osi_secuencial: "3530",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-09-16 15:34:42.224354+00",
    fecha_emision: "2026-09-16 15:56:16.847+00",
    fecha_inicio_real: "2026-09-17",
    fecha_fin_real: "2026-09-18",
    status_changed_at: "2026-09-19 21:48:47.04+00",
    updated_at: "2026-09-19 21:48:46.477572+00",
    id_ecc: 1671,
    id_trato: 983,
    id_presupuesto: 1055,
    nro_presupuesto: 21239,
    empresa: "BIX OIL SOCIEDAD ANONIMA",
    servicio: "EXCELENCIA OPERACIONAL"
  },
  {
    id: 306,
    nro_osi_secuencial: "3509",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-09-16 13:36:33.128215+00",
    fecha_emision: "2026-09-16 13:48:08.848+00",
    fecha_inicio_real: "2026-09-17",
    fecha_fin_real: "2026-09-18",
    status_changed_at: "2026-09-19 21:48:47.459+00",
    updated_at: "2026-09-19 21:48:46.90434+00",
    id_ecc: 1579,
    id_trato: 937,
    id_presupuesto: 1004,
    nro_presupuesto: 21188,
    empresa: "INGENIERIA SERVICIOS Y SOLDADURAS ISMESOL, C.A.",
    servicio: "EXCELENCIA OPERACIONAL"
  },
  {
    id: 305,
    nro_osi_secuencial: "3529",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-09-15 19:22:40.665179+00",
    fecha_emision: "2026-09-15 19:25:57.691+00",
    fecha_inicio_real: "2026-09-16",
    fecha_fin_real: "2026-09-16",
    status_changed_at: "2026-09-19 21:48:47.032823+00",
    updated_at: "2026-09-19 21:48:47.032823+00",
    id_ecc: 1707,
    id_trato: 1001,
    id_presupuesto: 1065,
    nro_presupuesto: 21249,
    empresa: "QUIMAINCA",
    servicio: "MANEJO DEFENSIVO (EDUCACIÓN VIAL)"
  },
  {
    id: 304,
    nro_osi_secuencial: "3528",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-09-15 14:04:18.671106+00",
    fecha_emision: "2026-09-15 14:40:58.068+00",
    fecha_inicio_real: "2026-09-17",
    fecha_fin_real: "2026-09-18",
    status_changed_at: "2026-09-19 21:48:47.72+00",
    updated_at: "2026-09-19 21:48:47.145058+00",
    id_ecc: 1698,
    "id_trato": 994,
    id_presupuesto: 1058,
    nro_presupuesto: 21242,
    empresa: "SERVICIOS Y SUMINISTROS V & B, C.A",
    servicio: "EXCELENCIA OPERACIONAL"
  },
  {
    id: 303,
    nro_osi_secuencial: "3527",
    id_estatus: 11,
    estatus_actual: "En Proceso",
    created_at: "2026-09-11 20:17:50.28877+00",
    fecha_emision: "2026-09-11 20:42:55.039+00",
    fecha_inicio_real: "2026-09-26",
    fecha_fin_real: "2026-09-27",
    status_changed_at: "2026-09-11 20:42:55.137506+00",
    updated_at: "2026-09-11 20:44:17.092526+00",
    id_ecc: 1692,
    id_trato: 989,
    id_presupuesto: 1046,
    nro_presupuesto: 21230,
    empresa: "CONSTRUCCIONES ORENSE DE VENEZUELA S A (COVSA)",
    servicio: "EXCELENCIA OPERACIONAL"
  },
  {
    id: 302,
    nro_osi_secuencial: "3526",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-09-11 17:32:58.402194+00",
    fecha_emision: "2026-09-11 19:07:23.833+00",
    fecha_inicio_real: "2026-09-14",
    fecha_fin_real: "2026-09-14",
    status_changed_at: "2026-09-19 21:48:47.417+00",
    updated_at: "2026-09-19 21:48:46.885517+00",
    id_ecc: 1683,
    id_trato: 986,
    id_presupuesto: 1045,
    nro_presupuesto: 21229,
    empresa: "VESERGEN C.A",
    servicio: "PERMISO DE TRABAJO"
  },
  {
    id: 301,
    nro_osi_secuencial: "3525",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-09-11 13:08:14.224302+00",
    fecha_emision: "2026-09-11 13:18:46.509+00",
    fecha_inicio_real: "2026-09-12",
    fecha_fin_real: "2026-09-12",
    status_changed_at: "2026-09-19 23:51:47.606+00",
    updated_at: "2026-09-19 23:51:46.732186+00",
    id_ecc: 1690,
    id_trato: 988,
    id_presupuesto: 1043,
    nro_presupuesto: 21227,
    empresa: "NEW PROYECT CA",
    servicio: "SEGURIDAD EN ESPACIOS CONFINADOS"
  },
  {
    id: 300,
    nro_osi_secuencial: "3524",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-09-11 13:06:57.308486+00",
    fecha_emision: "2026-09-11 13:16:13.076+00",
    fecha_inicio_real: "2026-09-12",
    fecha_fin_real: "2026-09-12",
    status_changed_at: "2026-09-19 23:51:47.613+00",
    updated_at: "2026-09-19 23:51:46.724952+00",
    id_ecc: 1691,
    id_trato: 988,
    id_presupuesto: 1043,
    nro_presupuesto: 21227,
    empresa: "NEW PROYECT CA",
    servicio: "TRABAJO EN ALTURAS"
  },
  {
    id: 299,
    nro_osi_secuencial: "3523",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-09-11 13:05:26.105518+00",
    fecha_emision: "2026-09-11 13:13:39.479+00",
    fecha_inicio_real: "2026-09-11",
    fecha_fin_real: "2026-09-11",
    status_changed_at: "2026-09-11 14:52:43.212833+00",
    updated_at: "2026-09-11 15:02:01.175012+00",
    id_ecc: 1689,
    id_trato: 988,
    id_presupuesto: 1043,
    nro_presupuesto: 21227,
    empresa: "NEW PROYECT CA",
    servicio: "MANEJO SEGURO DEL SULFURO DE HIDRÓGENO (H2S)"
  },
  {
    id: 298,
    nro_osi_secuencial: "3522",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-09-11 12:55:31.23272+00",
    fecha_emision: "2026-09-11 13:10:43.898+00",
    fecha_inicio_real: "2026-09-11",
    fecha_fin_real: "2026-09-11",
    status_changed_at: "2026-09-11 13:11:31.858+00",
    updated_at: "2026-09-11 15:03:46.06876+00",
    id_ecc: 1688,
    id_trato: 988,
    id_presupuesto: 1043,
    nro_presupuesto: 21227,
    empresa: "NEW PROYECT CA",
    servicio: "EVALUACIÓN DE ATMÓSFERAS PELIGROSAS"
  },
  {
    id: 297,
    nro_osi_secuencial: "3521",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-09-10 13:11:05.79303+00",
    fecha_emision: "2026-09-10 14:29:32.818+00",
    fecha_inicio_real: "2026-09-12",
    fecha_fin_real: "2026-09-12",
    status_changed_at: "2026-09-19 23:51:47.62+00",
    updated_at: "2026-09-19 23:51:46.73722+00",
    id_ecc: 1603,
    id_trato: 949,
    id_presupuesto: 1016,
    nro_presupuesto: 21200,
    empresa: "AGARCORP DE VENEZUELA, C.A.",
    servicio: "TRABAJO EN ALTURAS"
  },
  {
    id: 296,
    nro_osi_secuencial: "3352",
    id_estatus: 11,
    estatus_actual: "En Proceso",
    created_at: "2026-09-09 21:02:24.968687+00",
    fecha_emision: "2026-09-10 14:35:52.236+00",
    fecha_inicio_real: "2026-07-13",
    fecha_fin_real: "2026-07-13",
    status_changed_at: "2026-09-10 14:35:52.311056+00",
    updated_at: "2026-09-10 14:35:53.378026+00",
    id_ecc: 1659,
    id_trato: 977,
    id_presupuesto: 1035,
    nro_presupuesto: 21219,
    empresa: "COCA COLA FEMSA DE VENEZUELA, S.A",
    servicio: "MATRIZ DE IDENTIFICACIÓN Y EVALUACIÓN DE RIESGOS (IPER)"
  },
  {
    id: 295,
    nro_osi_secuencial: "3520",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-09-08 20:05:27.794732+00",
    fecha_emision: "2026-09-08 20:11:18.309+00",
    fecha_inicio_real: "2026-09-09",
    fecha_fin_real: "2026-09-09",
    status_changed_at: "2026-09-19 23:51:46.770096+00",
    updated_at: "2026-09-19 23:51:46.770096+00",
    id_ecc: 1642,
    id_trato: 972,
    id_presupuesto: 1032,
    nro_presupuesto: 21216,
    empresa: "INVERSIONES LACTEAS SAN SIMÓN, C.A.",
    servicio: "MANEJO DE MONTACARGAS"
  },
  {
    id: 294,
    nro_osi_secuencial: "3518",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-09-08 15:16:25.900644+00",
    fecha_emision: "2026-09-08 19:21:46.964+00",
    fecha_inicio_real: "2026-09-17",
    fecha_fin_real: "2026-09-18",
    status_changed_at: "2026-09-23 01:09:51.267+00",
    updated_at: "2026-09-23 01:09:51.55214+00",
    id_ecc: 1637,
    id_trato: 968,
    id_presupuesto: 1030,
    nro_presupuesto: 21214,
    empresa: "VELSERVICE,C A",
    servicio: "EXCELENCIA OPERACIONAL"
  },
  {
    id: 293,
    nro_osi_secuencial: "3516",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-09-08 13:38:37.771049+00",
    fecha_emision: "2026-09-08 13:59:50.556+00",
    fecha_inicio_real: "2026-09-09",
    fecha_fin_real: "2026-09-10",
    status_changed_at: "2026-09-19 23:51:47.917+00",
    updated_at: "2026-09-19 23:51:47.120158+00",
    id_ecc: 1618,
    id_trato: 958,
    id_presupuesto: 1027,
    nro_presupuesto: 21211,
    empresa: "VELSERVICE,C A",
    servicio: "EXCELENCIA OPERACIONAL"
  },
  {
    id: 292,
    nro_osi_secuencial: "3519",
    id_estatus: 11,
    estatus_actual: "En Proceso",
    created_at: "2026-09-08 12:48:34.747341+00",
    fecha_emision: "2026-09-08 19:42:29.659+00",
    fecha_inicio_real: "2026-09-14",
    fecha_fin_real: "2026-09-29",
    status_changed_at: "2026-09-19 23:51:47.456+00",
    updated_at: "2026-09-19 23:51:46.559157+00",
    id_ecc: 1110,
    id_trato: 692,
    id_presupuesto: 776,
    nro_presupuesto: 20960,
    empresa: "COCA COLA FEMSA DE VENEZUELA, S.A",
    servicio: "CONTROL DE ENERGÍA PELIGROSA (LOTO) Y GUARDAS DE SEGURIDAD"
  },
  {
    id: 291,
    nro_osi_secuencial: "3517",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-09-07 21:02:45.999842+00",
    fecha_emision: "2026-09-08 14:16:59.826+00",
    fecha_inicio_real: "2026-09-12",
    fecha_fin_real: "2026-09-12",
    status_changed_at: "2026-09-19 23:51:47.627+00",
    updated_at: "2026-09-19 23:51:46.731476+00",
    id_ecc: 1385,
    id_trato: 832,
    id_presupuesto: 846,
    nro_presupuesto: 21030,
    empresa: "PEDECA ORIENTE CA",
    servicio: "EXCELENCIA OPERACIONAL"
  },
  {
    id: 290,
    nro_osi_secuencial: "3515",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-09-07 18:31:54.171935+00",
    fecha_emision: "2026-09-07 21:22:15.774+00",
    fecha_inicio_real: "2026-09-12",
    fecha_fin_real: "2026-09-12",
    status_changed_at: "2026-09-23 02:03:53.328535+00",
    updated_at: "2026-09-23 02:03:53.328535+00",
    id_ecc: 1605,
    id_trato: 951,
    id_presupuesto: 1024,
    nro_presupuesto: 21208,
    empresa: "INVERSIONES LACTEAS SAN SIMÓN, C.A.",
    servicio: "MANEJO DE MONTACARGAS"
  },
  {
    id: 289,
    nro_osi_secuencial: "3514",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-09-05 17:16:39.308421+00",
    fecha_emision: "2026-09-05 17:18:56.262+00",
    fecha_inicio_real: "2026-09-05",
    fecha_fin_real: "2026-09-05",
    status_changed_at: "2026-09-05 19:22:10.039372+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1628,
    id_trato: 963,
    id_presupuesto: 1025,
    nro_presupuesto: 21209,
    empresa: "NEW PROYECT CA",
    servicio: "EXCELENCIA OPERACIONAL"
  },
  {
    id: 288,
    nro_osi_secuencial: "3513",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-09-04 17:09:03.309516+00",
    fecha_emision: "2026-09-04 17:46:28.747+00",
    fecha_inicio_real: "2026-09-07",
    fecha_fin_real: "2026-09-08",
    status_changed_at: "2026-09-08 17:52:36.654237+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1607,
    id_trato: 953,
    id_presupuesto: 1023,
    nro_presupuesto: 21207,
    empresa: "INVERSIONES LACTEAS SAN SIMÓN, C.A.",
    servicio: "TRABAJO EN ALTURAS"
  },
  {
    id: 287,
    nro_osi_secuencial: "3512",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-09-04 15:40:55.574109+00",
    fecha_emision: "2026-09-04 15:49:42.651+00",
    fecha_inicio_real: "2026-09-05",
    fecha_fin_real: "2026-09-06",
    status_changed_at: "2026-09-23 02:03:53.307+00",
    updated_at: "2026-09-23 02:03:53.495446+00",
    id_ecc: 1590,
    id_trato: 944,
    id_presupuesto: 1011,
    nro_presupuesto: 21195,
    empresa: "SARCOS PORRAS CONSTRUCCIONES C.A",
    servicio: "EXCELENCIA OPERACIONAL"
  },
  {
    id: 286,
    nro_osi_secuencial: "3511",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-09-04 13:18:14.120202+00",
    fecha_emision: "2026-09-04 13:38:11.228+00",
    fecha_inicio_real: "2026-09-05",
    fecha_fin_real: "2026-09-06",
    status_changed_at: "2026-09-23 02:03:51.961+00",
    updated_at: "2026-09-23 02:03:52.073844+00",
    id_ecc: 1609,
    id_trato: 954,
    id_presupuesto: 1020,
    nro_presupuesto: 21204,
    empresa: "2C SERVICIOS LOGISTICOS, C.A.",
    servicio: "EXCELENCIA OPERACIONAL"
  },
  {
    id: 285,
    nro_osi_secuencial: "3510",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-09-04 13:02:02.157103+00",
    fecha_emision: "2026-09-04 13:16:07.792+00",
    fecha_inicio_real: "2026-09-05",
    fecha_fin_real: "2026-09-06",
    status_changed_at: "2026-09-23 02:03:53.89+00",
    updated_at: "2026-09-23 02:03:54.02983+00",
    id_ecc: 1601,
    id_trato: 948,
    id_presupuesto: 1015,
    nro_presupuesto: 21199,
    empresa: "CORROSION 2000, S.A",
    servicio: "EXCELENCIA OPERACIONAL"
  },
  {
    id: 284,
    nro_osi_secuencial: "PEN-3525",
    id_estatus: 39,
    estatus_actual: "OSI NO EJECUTADA",
    created_at: "2026-09-04 12:21:56.345455+00",
    fecha_emision: null,
    fecha_inicio_real: "2026-09-05",
    fecha_fin_real: "2026-09-06",
    status_changed_at: "2026-09-09 13:09:03.202713+00",
    updated_at: "2026-09-09 13:13:16.779153+00",
    id_ecc: 1602,
    id_trato: 948,
    id_presupuesto: 1015,
    nro_presupuesto: 21199,
    empresa: "CORROSION 2000, S.A",
    servicio: "REFRIGERIO"
  },
  {
    id: 283,
    nro_osi_secuencial: "3508",
    id_estatus: 11,
    estatus_actual: "En Proceso",
    created_at: "2026-09-03 13:50:30.477339+00",
    fecha_emision: "2026-09-03 15:34:25.402+00",
    fecha_inicio_real: "2026-09-03",
    fecha_fin_real: "2026-09-03",
    status_changed_at: "2026-09-04 14:29:46.989+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1610,
    id_trato: 955,
    id_presupuesto: 1013,
    nro_presupuesto: 21197,
    empresa: "COCA COLA FEMSA DE VENEZUELA, S.A",
    servicio: "PRACTICA DE BRIGADA DE EMERGENCIA"
  },
  {
    id: 282,
    nro_osi_secuencial: "3507",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-09-02 17:55:00.613642+00",
    fecha_emision: "2026-09-02 18:08:18.854+00",
    fecha_inicio_real: "2026-09-03",
    fecha_fin_real: "2026-09-04",
    status_changed_at: "2026-09-04 14:28:20.00154+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1448,
    id_trato: 868,
    id_presupuesto: 900,
    nro_presupuesto: 21084,
    empresa: "LEAK REPAIRS VENEZUELA, C.A",
    servicio: "EXCELENCIA OPERACIONAL"
  },
  {
    id: 281,
    nro_osi_secuencial: "3496",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-09-01 21:01:10.279393+00",
    fecha_emision: "2026-09-02 13:00:40.972+00",
    fecha_inicio_real: "2026-09-05",
    fecha_fin_real: "2026-09-13",
    status_changed_at: "2026-09-23 02:03:53.348+00",
    updated_at: "2026-09-23 02:03:53.578345+00",
    id_ecc: 1457,
    id_trato: 875,
    id_presupuesto: 904,
    nro_presupuesto: 21088,
    empresa: "MUNDO MARINO R.S, C.A",
    servicio: "SEGURIDAD, HIGIENE Y AMBIENTE MÓDULO SUPERVISORIO"
  },
  {
    id: 280,
    nro_osi_secuencial: "3506",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-09-01 20:01:49.748093+00",
    fecha_emision: "2026-09-01 20:19:58.67+00",
    fecha_inicio_real: "2026-09-04",
    fecha_fin_real: "2026-09-04",
    status_changed_at: "2026-09-04 14:29:28.490164+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1107,
    id_trato: 690,
    id_presupuesto: 671,
    nro_presupuesto: 20855,
    empresa: "INDUSTRIAL VENEZOLANA DE GAS INVEGAS SCA",
    servicio: "OPERACIONES DE GRUAS PUENTE Y POLIPASTO"
  },
  {
    id: 279,
    nro_osi_secuencial: "3355",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-09-01 18:57:34.445273+00",
    fecha_emision: "2026-09-01 19:01:40.029+00",
    fecha_inicio_real: "2026-07-06",
    fecha_fin_real: "2026-07-07",
    status_changed_at: "2026-09-01 19:15:14.537+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1591,
    id_trato: 945,
    id_presupuesto: 1007,
    nro_presupuesto: 204160,
    empresa: "COCA COLA FEMSA DE VENEZUELA, S.A",
    servicio: "MANEJO DE MONTACARGAS"
  },
  {
    id: 278,
    nro_osi_secuencial: "PEN-3524",
    id_estatus: 39,
    estatus_actual: "OSI NO EJECUTADA",
    created_at: "2026-08-31 16:01:26.991782+00",
    fecha_emision: null,
    fecha_inicio_real: "2026-08-03",
    fecha_fin_real: "2026-08-03",
    status_changed_at: "2026-09-09 13:09:12.049159+00",
    updated_at: "2026-09-09 13:13:16.779153+00",
    id_ecc: 1583,
    id_trato: 939,
    id_presupuesto: 1003,
    nro_presupuesto: 21187,
    empresa: "COBICRE SERVICIOS, C.A",
    servicio: "REFRIGERIO"
  },
  {
    id: 277,
    nro_osi_secuencial: "3504",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-31 15:59:22.781343+00",
    fecha_emision: "2026-08-31 18:10:21.272+00",
    fecha_inicio_real: "2026-09-03",
    fecha_fin_real: "2026-09-04",
    status_changed_at: "2026-09-04 14:28:45.239338+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1572,
    id_trato: 932,
    id_presupuesto: 999,
    nro_presupuesto: 21183,
    empresa: "COBICRE SERVICIOS, C.A",
    servicio: "EXCELENCIA OPERACIONAL"
  },
  {
    id: 276,
    nro_osi_secuencial: "3501",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-31 15:56:25.622827+00",
    fecha_emision: "2026-08-31 18:02:06.357+00",
    fecha_inicio_real: "2026-09-01",
    fecha_fin_real: "2026-09-02",
    status_changed_at: "2026-09-04 14:27:15.715114+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1527,
    id_trato: 905,
    id_presupuesto: 969,
    nro_presupuesto: 21153,
    empresa: "COBICRE SERVICIOS, C.A",
    servicio: "EXCELENCIA OPERACIONAL"
  },
  {
    id: 275,
    nro_osi_secuencial: "3505",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-31 15:02:53.09286+00",
    fecha_emision: "2026-08-31 18:17:52.738+00",
    fecha_inicio_real: "2026-09-03",
    fecha_fin_real: "2026-09-04",
    status_changed_at: "2026-09-04 14:29:10.400016+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1563,
    id_trato: 926,
    id_presupuesto: 996,
    nro_presupuesto: 21180,
    empresa: "SERVICIOS Y OBRAS INTEGRALES DE VENEZUELA, C.A",
    servicio: "EXCELENCIA OPERACIONAL"
  },
  {
    id: 274,
    nro_osi_secuencial: "3503",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-31 12:47:30.170802+00",
    fecha_emision: "2026-08-31 13:39:07.569+00",
    fecha_inicio_real: "2026-09-03",
    fecha_fin_real: "2026-09-04",
    status_changed_at: "2026-09-23 02:03:53.718+00",
    updated_at: "2026-09-23 02:03:53.886568+00",
    id_ecc: 1561,
    id_trato: 925,
    id_presupuesto: 998,
    nro_presupuesto: 21182,
    empresa: "DRAPCOM, C.A",
    servicio: "EXCELENCIA OPERACIONAL"
  },
  {
    id: 273,
    nro_osi_secuencial: "3502",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-28 20:42:03.749446+00",
    fecha_emision: "2026-08-28 20:46:48.689+00",
    fecha_inicio_real: "2026-08-31",
    fecha_fin_real: "2026-08-31",
    status_changed_at: "2026-09-05 18:03:37.028108+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 934,
    id_trato: 566,
    id_presupuesto: 574,
    nro_presupuesto: 20769,
    empresa: "COCA COLA FEMSA DE VENEZUELA, S.A",
    servicio: "REGLAS QUE SALVAN VIDAS"
  },
  {
    id: 272,
    nro_osi_secuencial: "3500",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-27 20:29:26.91887+00",
    fecha_emision: "2026-08-27 20:31:11.428+00",
    fecha_inicio_real: "2026-08-28",
    fecha_fin_real: "2026-08-28",
    status_changed_at: "2026-09-03 13:24:36.673+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1570,
    id_trato: 930,
    id_presupuesto: 992,
    nro_presupuesto: 21176,
    empresa: "NEW PROYECT CA",
    servicio: "SEGURIDAD EN ESPACIOS CONFINADOS"
  },
  {
    id: 271,
    nro_osi_secuencial: "3499",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-27 18:51:51.841259+00",
    fecha_emision: "2026-08-27 18:54:19.636+00",
    fecha_inicio_real: "2026-08-28",
    fecha_fin_real: "2026-08-28",
    status_changed_at: "2026-09-23 02:03:53.724+00",
    updated_at: "2026-09-23 02:03:53.980872+00",
    id_ecc: 1577,
    id_trato: 936,
    id_presupuesto: 1000,
    nro_presupuesto: 21184,
    empresa: "COCA COLA FEMSA DE VENEZUELA, S.A",
    servicio: "BLOQUEO Y ETIQUETADO LOTO (LOTO-LOCK OUT TAG OUT)"
  },
  {
    id: 270,
    nro_osi_secuencial: "3497",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-27 15:50:05.727326+00",
    fecha_emision: "2026-08-27 17:25:54.367+00",
    fecha_inicio_real: "2026-09-05",
    fecha_fin_real: "2026-09-05",
    status_changed_at: "2026-09-08 17:47:23.359+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1571,
    id_trato: 931,
    id_presupuesto: 995,
    nro_presupuesto: 21179,
    empresa: "CORPORACIÓN JF, C.A.",
    servicio: "MANEJO DEFENSIVO DE FLOTA PESADA"
  },
  {
    id: 269,
    nro_osi_secuencial: "3494",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-27 15:47:17.795176+00",
    fecha_emision: "2026-08-27 17:27:56.13+00",
    fecha_inicio_real: "2026-08-30",
    fecha_fin_real: "2026-08-30",
    status_changed_at: "2026-09-03 13:30:48.291+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1442,
    id_trato: 863,
    id_presupuesto: 981,
    nro_presupuesto: 21165,
    empresa: "MUNDO MARINO R.S, C.A",
    servicio: "MANEJO SEGURO DE MATERIALES PELIGROSOS"
  },
  {
    id: 268,
    nro_osi_secuencial: "3495",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-27 15:40:04.949345+00",
    fecha_emision: "2026-08-27 17:29:04.577+00",
    fecha_inicio_real: "2026-08-29",
    fecha_fin_real: "2026-08-29",
    status_changed_at: "2026-09-03 13:29:58.143+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1443,
    id_trato: 863,
    id_presupuesto: 982,
    nro_presupuesto: 21166,
    empresa: "MUNDO MARINO R.S, C.A",
    servicio: "EVALUACIÓN DE ATMÓSFERAS PELIGROSAS"
  },
  {
    id: 267,
    nro_osi_secuencial: "3498",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-27 14:26:25.356165+00",
    fecha_emision: "2026-08-27 17:35:30.286+00",
    fecha_inicio_real: "2026-08-31",
    fecha_fin_real: "2026-08-31",
    status_changed_at: "2026-09-03 13:34:13.511136+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1227,
    id_trato: 749,
    id_presupuesto: 745,
    nro_presupuesto: 20929,
    empresa: "COCA COLA FEMSA DE VENEZUELA, S.A",
    servicio: "ERGONOMIA - SEGURIDAD VIAL AYUDANTES"
  },
  {
    id: 266,
    nro_osi_secuencial: "3492",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-26 17:39:37.601562+00",
    fecha_emision: "2026-08-26 17:50:29.826+00",
    fecha_inicio_real: "2026-09-12",
    fecha_fin_real: "2026-09-13",
    status_changed_at: "2026-09-23 02:03:53.537+00",
    updated_at: "2026-09-23 02:03:53.803492+00",
    id_ecc: 1553,
    id_trato: 919,
    id_presupuesto: 983,
    nro_presupuesto: 21167,
    empresa: "CONSTRUCCIONES ORENSE DE VENEZUELA S A (COVSA)",
    servicio: "EXCELENCIA OPERACIONAL"
  },
  {
    id: 265,
    nro_osi_secuencial: "3493",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-26 16:54:34.046831+00",
    fecha_emision: "2026-08-26 17:53:14.914+00",
    fecha_inicio_real: "2026-08-31",
    fecha_fin_real: "2026-09-01",
    status_changed_at: "2026-09-03 13:33:17.677021+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1397,
    id_trato: 840,
    id_presupuesto: 872,
    nro_presupuesto: 21056,
    empresa: "COCA COLA FEMSA DE VENEZUELA, S.A",
    servicio: "PROCESOS, HIGIENE POSTURAL Y SEGURIDAD EN EL DESPACHO"
  },
  {
    id: 264,
    nro_osi_secuencial: "3489",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-24 15:46:53.922943+00",
    fecha_emision: "2026-08-24 17:13:15.135+00",
    fecha_inicio_real: "2026-08-28",
    fecha_fin_real: "2026-08-28",
    status_changed_at: "2026-09-03 13:24:16.518+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1526,
    id_trato: 904,
    id_presupuesto: 964,
    nro_presupuesto: 21148,
    empresa: "QUIMAINCA",
    servicio: "EVALUACIÓN DE ATMÓSFERAS PELIGROSAS"
  },
  {
    id: 263,
    nro_osi_secuencial: "3488",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-24 15:45:41.508559+00",
    fecha_emision: "2026-08-24 17:11:38.863+00",
    fecha_inicio_real: "2026-08-27",
    fecha_fin_real: "2026-08-27",
    status_changed_at: "2026-09-03 13:22:08.151+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1479,
    id_trato: 881,
    id_presupuesto: 926,
    nro_presupuesto: 21110,
    empresa: "QUIMAINCA",
    servicio: "MANEJO SEGURO DEL SULFURO DE HIDRÓGENO (H2S)"
  },
  {
    id: 262,
    nro_osi_secuencial: "3487",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-24 15:43:34.056173+00",
    fecha_emision: "2026-08-24 17:10:23.86+00",
    fecha_inicio_real: "2026-08-26",
    fecha_fin_real: "2026-08-26",
    status_changed_at: "2026-09-03 12:48:04.031+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1477,
    id_trato: 881,
    id_presupuesto: 926,
    nro_presupuesto: 21110,
    empresa: "QUIMAINCA",
    servicio: "SEGURIDAD EN ESPACIOS CONFINADOS"
  },
  {
    id: 261,
    nro_osi_secuencial: "3490",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-24 15:43:31.804686+00",
    fecha_emision: "2026-08-24 17:15:11.451+00",
    fecha_inicio_real: "2026-08-29",
    fecha_fin_real: "2026-08-30",
    status_changed_at: "2026-09-23 02:03:53.692348+00",
    updated_at: "2026-09-23 02:03:53.692348+00",
    id_ecc: 1346,
    id_trato: 810,
    id_presupuesto: 823,
    nro_presupuesto: 21007,
    empresa: "CONSTRUCCIONES ORENSE DE VENEZUELA S A (COVSA)",
    servicio: "EXCELENCIA OPERACIONAL"
  },
  {
    id: 260,
    nro_osi_secuencial: "3486",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-24 15:41:26.918427+00",
    fecha_emision: "2026-08-24 17:08:16.834+00",
    fecha_inicio_real: "2026-08-25",
    fecha_fin_real: "2026-08-25",
    status_changed_at: "2026-08-26 12:42:31.982432+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1471,
    id_trato: 881,
    id_presupuesto: 926,
    nro_presupuesto: 21110,
    empresa: "QUIMAINCA",
    servicio: "MANEJO SEGURO DE MATERIALES PELIGROSOS"
  },
  {
    id: 259,
    nro_osi_secuencial: "3485",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-24 13:52:38.085993+00",
    fecha_emision: "2026-08-24 14:42:54.927+00",
    fecha_inicio_real: "2026-08-29",
    fecha_fin_real: "2026-08-30",
    status_changed_at: "2026-09-23 02:03:53.402+00",
    updated_at: "2026-09-23 02:03:53.729348+00",
    id_ecc: 1440,
    id_trato: 861,
    id_presupuesto: 888,
    nro_presupuesto: 21072,
    empresa: "R G C A",
    servicio: "EXCELENCIA OPERACIONAL"
  },
  {
    id: 258,
    nro_osi_secuencial: "3491",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-21 17:41:25.073277+00",
    fecha_emision: "2026-08-25 13:35:29.237+00",
    fecha_inicio_real: "2026-08-26",
    fecha_fin_real: "2026-08-27",
    status_changed_at: "2026-09-23 02:03:52.314+00",
    updated_at: "2026-09-23 02:03:52.570674+00",
    id_ecc: 1308,
    id_trato: 793,
    id_presupuesto: 801,
    nro_presupuesto: 20985,
    empresa: "AVENRUT, C.A",
    servicio: "MANEJO Y USO DE EXTINTORES PORTÁTILES"
  },
  {
    id: 257,
    nro_osi_secuencial: "3483",
    id_estatus: 11,
    estatus_actual: "En Proceso",
    created_at: "2026-08-21 17:21:48.342396+00",
    fecha_emision: "2026-08-21 17:53:04.473+00",
    fecha_inicio_real: "2026-08-21",
    fecha_fin_real: "2026-08-21",
    status_changed_at: "2026-08-21 17:53:04.557017+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1534,
    id_trato: 910,
    id_presupuesto: 967,
    nro_presupuesto: 21151,
    empresa: "COCA COLA FEMSA DE VENEZUELA, S.A",
    servicio: "MANEJO DEFENSIVO PARA MOTOCICLETAS"
  },
  {
    id: 256,
    nro_osi_secuencial: "3482",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-21 15:36:06.538035+00",
    fecha_emision: "2026-08-21 17:21:23.779+00",
    fecha_inicio_real: "2026-09-03",
    fecha_fin_real: "2026-09-03",
    status_changed_at: "2026-09-04 14:27:49.636733+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1310,
    id_trato: 793,
    id_presupuesto: 801,
    nro_presupuesto: 20985,
    empresa: "AVENRUT, C.A",
    servicio: "MANEJO Y USO DE EXTINTORES PORTÁTILES"
  },
  {
    id: 255,
    nro_osi_secuencial: "3480",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-21 14:23:06.10827+00",
    fecha_emision: "2026-08-21 15:00:40.786+00",
    fecha_inicio_real: "2026-08-28",
    fecha_fin_real: "2026-08-28",
    status_changed_at: "2026-09-03 20:08:19.275604+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1428,
    id_trato: 854,
    id_presupuesto: 954,
    nro_presupuesto: 21138,
    empresa: "SUPERMETANOL, C.A",
    servicio: "MANEJO DEFENSIVO (EDUCACIÓN VIAL)"
  },
  {
    id: 254,
    nro_osi_secuencial: "3481",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-21 14:18:27.569564+00",
    fecha_emision: "2026-08-21 15:04:25.614+00",
    fecha_inicio_real: "2026-08-26",
    fecha_fin_real: "2026-08-26",
    status_changed_at: "2026-09-03 12:47:50.273+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1237,
    id_trato: 755,
    id_presupuesto: 953,
    nro_presupuesto: 21137,
    empresa: "SUPERMETANOL, C.A",
    servicio: "PERMISO DE TRABAJO"
  },
  {
    id: 253,
    nro_osi_secuencial: "3479",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-21 13:51:03.499972+00",
    fecha_emision: "2026-08-21 14:53:31.113+00",
    fecha_inicio_real: "2026-08-24",
    fecha_fin_real: "2026-08-24",
    status_changed_at: "2026-08-25 13:34:56.433434+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1240,
    id_trato: 755,
    id_presupuesto: 747,
    nro_presupuesto: 20931,
    empresa: "SUPERMETANOL, C.A",
    servicio: "EVALUACIÓN DE ATMÓSFERAS PELIGROSAS"
  },
  {
    id: 252,
    nro_osi_secuencial: "3478",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-21 13:49:33.282374+00",
    fecha_emision: "2026-08-21 14:47:41.905+00",
    fecha_inicio_real: "2026-08-24",
    fecha_fin_real: "2026-08-24",
    status_changed_at: "2026-09-14 19:22:06.311808+00",
    updated_at: "2026-09-14 19:22:06.311808+00",
    id_ecc: 1239,
    id_trato: 755,
    id_presupuesto: 747,
    nro_presupuesto: 20931,
    empresa: "SUPERMETANOL, C.A",
    servicio: "SEGURIDAD EN ESPACIOS CONFINADOS"
  },
  {
    id: 251,
    nro_osi_secuencial: "3484",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-20 20:36:02.002587+00",
    fecha_emision: "2026-08-21 19:02:06.247+00",
    fecha_inicio_real: "2026-08-24",
    fecha_fin_real: "2026-08-24",
    status_changed_at: "2026-09-01 13:19:45.951608+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1224,
    id_trato: 747,
    id_presupuesto: 753,
    nro_presupuesto: 20937,
    empresa: "COCA COLA FEMSA DE VENEZUELA, S.A",
    servicio: "ERGONOMÍA SEGURIDAD VIAL AYUDANES"
  },
  {
    id: 250,
    nro_osi_secuencial: "3477",
    id_estatus: 11,
    estatus_actual: "En Proceso",
    created_at: "2026-08-20 19:51:56.22382+00",
    fecha_emision: "2026-08-20 19:57:38.015+00",
    fecha_inicio_real: "2026-08-24",
    fecha_fin_real: "2026-08-24",
    status_changed_at: "2026-08-20 19:57:38.095213+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1530,
    id_trato: 908,
    id_presupuesto: 965,
    nro_presupuesto: 21149,
    empresa: "COCA COLA FEMSA DE VENEZUELA, S.A",
    servicio: "PERMISO DE TRABAJO EN CALIENTE"
  },
  {
    id: 249,
    nro_osi_secuencial: "3476",
    id_estatus: 11,
    estatus_actual: "En Proceso",
    created_at: "2026-08-20 19:50:31.494705+00",
    fecha_emision: "2026-08-20 19:55:32.355+00",
    fecha_inicio_real: "2026-08-22",
    fecha_fin_real: "2026-08-22",
    status_changed_at: "2026-08-20 19:55:32.463153+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1529,
    id_trato: 908,
    id_presupuesto: 966,
    nro_presupuesto: 21150,
    empresa: "COCA COLA FEMSA DE VENEZUELA, S.A",
    servicio: "TRABAJO EN ALTURAS"
  },
  {
    id: 248,
    nro_osi_secuencial: "3475",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-20 19:04:32.030436+00",
    fecha_emision: "2026-08-20 19:22:02.243+00",
    fecha_inicio_real: "2026-08-21",
    fecha_fin_real: "2026-08-21",
    status_changed_at: "2026-09-01 13:17:23.95266+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 448,
    id_trato: 252,
    id_presupuesto: 252,
    nro_presupuesto: 20392,
    empresa: "COCA COLA FEMSA DE VENEZUELA, S.A",
    servicio: "PERMISO DE TRABAJO"
  },
  {
    id: 247,
    nro_osi_secuencial: "3474",
    id_estatus: 11,
    estatus_actual: "En Proceso",
    created_at: "2026-08-20 15:41:05.954279+00",
    fecha_emision: "2026-08-20 15:50:08.122+00",
    fecha_inicio_real: "2026-08-19",
    fecha_fin_real: "2026-08-21",
    status_changed_at: "2026-08-20 15:50:08.243782+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1520,
    id_trato: 901,
    id_presupuesto: 927,
    nro_presupuesto: 21111,
    empresa: "CORPORACIÓN JF, C.A.",
    servicio: "SEGURIDAD, HIGIENE Y AMBIENTE MÓDULO SUPERVISORIO"
  },
  {
    id: 246,
    nro_osi_secuencial: "3473",
    id_estatus: 11,
    estatus_actual: "En Proceso",
    created_at: "2026-08-20 13:19:40.269948+00",
    fecha_emision: "2026-08-20 13:21:37.798+00",
    fecha_inicio_real: "2026-08-19",
    fecha_fin_real: "2026-08-21",
    status_changed_at: "2026-08-20 13:21:37.892297+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1459,
    id_trato: 877,
    id_presupuesto: 906,
    nro_presupuesto: 21090,
    empresa: "SHA DE VENEZUELA",
    servicio: "SEGURIDAD, HIGIENE Y AMBIENTE MÓDULO SUPERVISORIO"
  },
  {
    id: 245,
    nro_osi_secuencial: "3472",
    id_estatus: 11,
    estatus_actual: "En Proceso",
    created_at: "2026-08-19 19:12:33.329729+00",
    fecha_emision: "2026-08-19 19:20:02.014+00",
    fecha_inicio_real: "2026-08-19",
    fecha_fin_real: "2026-08-21",
    status_changed_at: "2026-08-19 19:20:02.082393+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1463,
    id_trato: 879,
    id_presupuesto: 907,
    nro_presupuesto: 21091,
    empresa: "SHA DE VENEZUELA",
    servicio: "SEGURIDAD, HIGIENE Y AMBIENTE MÓDULO SUPERVISORIO"
  },
  {
    id: 244,
    nro_osi_secuencial: "3471",
    id_estatus: 11,
    estatus_actual: "En Proceso",
    created_at: "2026-08-19 18:52:54.705367+00",
    fecha_emision: "2026-08-19 19:16:38.763+00",
    fecha_inicio_real: "2026-08-20",
    fecha_fin_real: "2026-08-21",
    status_changed_at: "2026-08-19 19:16:39.073414+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1450,
    id_trato: 870,
    id_presupuesto: 894,
    nro_presupuesto: 21078,
    empresa: "INNOVATECH SUPPLY, C.A",
    servicio: "EXCELENCIA OPERACIONAL"
  },
  {
    id: 243,
    nro_osi_secuencial: "3469",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-19 18:46:34.044498+00",
    fecha_emision: "2026-08-19 19:27:47.003+00",
    fecha_inicio_real: "2026-08-20",
    fecha_fin_real: "2026-08-21",
    status_changed_at: "2026-09-01 13:13:11.70229+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1449,
    id_trato: 869,
    id_presupuesto: 896,
    nro_presupuesto: 21080,
    empresa: "TECNO CONTROLES ORIENTE, C.A",
    servicio: "EXCELENCIA OPERACIONAL"
  },
  {
    id: 242,
    nro_osi_secuencial: "3470",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-19 18:31:57.737023+00",
    fecha_emision: "2026-08-19 18:41:10.73+00",
    fecha_inicio_real: "2026-08-20",
    fecha_fin_real: "2026-08-20",
    status_changed_at: "2026-09-01 13:13:31.286547+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1519,
    id_trato: 900,
    id_presupuesto: 905,
    nro_presupuesto: 21089,
    empresa: "COCA COLA FEMSA DE VENEZUELA, S.A",
    servicio: "PERMISO DE TRABAJO"
  },
  {
    id: 241,
    nro_osi_secuencial: "3465",
    id_estatus: 11,
    estatus_actual: "En Proceso",
    created_at: "2026-08-18 15:41:40.207336+00",
    fecha_emision: "2026-08-18 15:50:46.633+00",
    fecha_inicio_real: "2026-08-19",
    fecha_fin_real: "2026-08-21",
    status_changed_at: "2026-08-18 15:50:46.698675+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1333,
    id_trato: 802,
    id_presupuesto: 845,
    nro_presupuesto: 21029,
    empresa: "GRAN CACIQUE II, C.A",
    servicio: "SEGURIDAD, HIGIENE Y AMBIENTE MÓDULO SUPERVISORIO"
  },
  {
    id: 240,
    nro_osi_secuencial: "3464",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-18 15:26:56.997582+00",
    fecha_emision: "2026-08-18 15:49:13.021+00",
    fecha_inicio_real: "2026-08-19",
    fecha_fin_real: "2026-08-21",
    status_changed_at: "2026-09-01 13:01:36.777258+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1251,
    id_trato: 763,
    id_presupuesto: 766,
    nro_presupuesto: 20950,
    empresa: "GRAN CACIQUE II, C.A",
    servicio: "SEGURIDAD, HIGIENE Y AMBIENTE MÓDULO SUPERVISORIO"
  },
  {
    id: 239,
    nro_osi_secuencial: "3466",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-18 15:05:18.197637+00",
    fecha_emision: "2026-08-18 15:12:11.593+00",
    fecha_inicio_real: "2026-08-18",
    fecha_fin_real: "2026-08-18",
    status_changed_at: "2026-08-19 15:12:17.516648+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1456,
    id_trato: 876,
    id_presupuesto: 899,
    nro_presupuesto: 21083,
    empresa: "SHA DE VENEZUELA",
    servicio: "MANEJO DEFENSIVO (EDUCACIÓN VIAL)"
  },
  {
    id: 238,
    nro_osi_secuencial: "3463",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-18 14:56:45.36701+00",
    fecha_emision: "2026-08-18 14:58:01.71+00",
    fecha_inicio_real: "2026-08-18",
    fecha_fin_real: "2026-08-18",
    status_changed_at: "2026-08-19 15:06:23.905111+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1446,
    id_trato: 867,
    id_presupuesto: 901,
    nro_presupuesto: 21085,
    empresa: "MUNDO MARINO R.S, C.A",
    servicio: "MANEJO DEFENSIVO (EDUCACIÓN VIAL)"
  },
  {
    id: 237,
    nro_osi_secuencial: "3461",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-17 21:00:21.158258+00",
    fecha_emision: "2026-08-17 21:02:30.203+00",
    fecha_inicio_real: "2026-06-09",
    fecha_fin_real: "2026-08-19",
    status_changed_at: "2026-09-01 13:10:35.467304+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1451,
    id_trato: 871,
    id_presupuesto: 897,
    nro_presupuesto: 20599,
    empresa: "COCA COLA FEMSA DE VENEZUELA, S.A",
    servicio: "PRACTICA DE BRIGADA DE EMERGENCIA"
  },
  {
    id: 236,
    nro_osi_secuencial: "3462",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-17 20:54:04.419875+00",
    fecha_emision: "2026-08-18 14:32:36.426+00",
    fecha_inicio_real: "2026-08-19",
    fecha_fin_real: "2026-08-21",
    status_changed_at: "2026-09-01 13:09:51.197375+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1445,
    id_trato: 865,
    id_presupuesto: 895,
    nro_presupuesto: 21079,
    empresa: "SHA DE VENEZUELA",
    servicio: "SEGURIDAD, HIGIENE Y AMBIENTE MÓDULO SUPERVISORIO"
  },
  {
    id: 235,
    nro_osi_secuencial: "3460",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-17 14:26:23.53034+00",
    fecha_emision: "2026-08-17 14:51:57.916+00",
    fecha_inicio_real: "2026-08-18",
    fecha_fin_real: "2026-08-18",
    status_changed_at: "2026-08-19 15:11:10.380538+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1444,
    id_trato: 864,
    id_presupuesto: 893,
    nro_presupuesto: 21077,
    empresa: "APSU PROCESS MANAGEMENT",
    servicio: "MANEJO DEFENSIVO (EDUCACIÓN VIAL)"
  },
  {
    id: 234,
    nro_osi_secuencial: "3459",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-17 14:16:20.256235+00",
    fecha_emision: "2026-08-17 14:44:38.473+00",
    fecha_inicio_real: "2026-08-18",
    fecha_fin_real: "2026-08-18",
    status_changed_at: "2026-08-19 15:11:50.226432+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1433,
    id_trato: 855,
    id_presupuesto: 891,
    nro_presupuesto: 21075,
    empresa: "TECNO CONTROLES ORIENTE, C.A",
    servicio: "MANEJO DEFENSIVO (EDUCACIÓN VIAL)"
  },
  {
    id: 233,
    nro_osi_secuencial: "3458",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-14 20:46:34.559873+00",
    fecha_emision: "2026-08-14 21:02:32.717+00",
    fecha_inicio_real: "2026-08-19",
    fecha_fin_real: "2026-08-19",
    status_changed_at: "2026-08-19 19:26:43.07584+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1432,
    id_trato: 855,
    id_presupuesto: 889,
    nro_presupuesto: 21073,
    empresa: "TECNO CONTROLES ORIENTE, C.A",
    servicio: "PERMISO DE TRABAJO"
  },
  {
    id: 232,
    nro_osi_secuencial: "3457",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-14 20:44:31.623857+00",
    fecha_emision: "2026-08-14 20:55:14.094+00",
    fecha_inicio_real: "2026-08-17",
    fecha_fin_real: "2026-08-17",
    status_changed_at: "2026-08-19 15:10:09.664041+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1430,
    id_trato: 855,
    id_presupuesto: 889,
    nro_presupuesto: 21073,
    empresa: "TECNO CONTROLES ORIENTE, C.A",
    servicio: "MANEJO SEGURO DEL SULFURO DE HIDRÓGENO (H2S)"
  },
  {
    id: 231,
    nro_osi_secuencial: "3456",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-14 20:43:35.260716+00",
    fecha_emision: "2026-08-14 20:50:33.789+00",
    fecha_inicio_real: "2026-08-17",
    fecha_fin_real: "2026-08-17",
    status_changed_at: "2026-08-19 15:07:41.503202+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1431,
    id_trato: 855,
    id_presupuesto: 889,
    nro_presupuesto: 21073,
    empresa: "TECNO CONTROLES ORIENTE, C.A",
    servicio: "EVALUACIÓN DE ATMÓSFERAS PELIGROSAS"
  },
  {
    id: 230,
    nro_osi_secuencial: "3455",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-14 13:43:10.158958+00",
    fecha_emision: "2026-08-14 13:52:11.724+00",
    fecha_inicio_real: "2026-08-15",
    fecha_fin_real: "2026-09-13",
    status_changed_at: "2026-09-23 02:03:53.331+00",
    updated_at: "2026-09-23 02:03:53.439741+00",
    id_ecc: 1389,
    id_trato: 835,
    id_presupuesto: 880,
    nro_presupuesto: 21064,
    empresa: "INVERSIONES Y SERVICIOS M & B VE CA",
    servicio: "EXCELENCIA OPERACIONAL"
  },
  {
    id: 229,
    nro_osi_secuencial: "3454",
    id_estatus: 11,
    estatus_actual: "En Proceso",
    created_at: "2026-08-13 20:11:02.710434+00",
    fecha_emision: "2026-08-13 20:21:19.183+00",
    fecha_inicio_real: "2026-08-18",
    fecha_fin_real: "2026-08-18",
    status_changed_at: "2026-08-13 20:21:19.260282+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1427,
    id_trato: 853,
    id_presupuesto: 881,
    nro_presupuesto: 21065,
    empresa: "COOPERATIVA GRUPO ADMI 92924 R.L",
    servicio: "MANEJO DEFENSIVO (EDUCACIÓN VIAL)"
  },
  {
    id: 228,
    nro_osi_secuencial: "3452",
    id_estatus: 11,
    estatus_actual: "En Proceso",
    created_at: "2026-08-12 15:12:20.314429+00",
    fecha_emision: "2026-08-12 15:45:20.778+00",
    fecha_inicio_real: "2026-08-17",
    fecha_fin_real: "2026-08-17",
    status_changed_at: "2026-08-12 15:45:20.871169+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1116,
    id_trato: 693,
    id_presupuesto: 699,
    nro_presupuesto: 20883,
    empresa: "COCA COLA FEMSA DE VENEZUELA, S.A",
    servicio: "MATRIZ DE IDENTIFICACIÓN Y EVALUACIÓN DE RIESGOS (IPER)"
  },
  {
    id: 227,
    nro_osi_secuencial: "3453",
    id_estatus: 11,
    estatus_actual: "En Proceso",
    created_at: "2026-08-12 15:11:17.90576+00",
    fecha_emision: "2026-08-12 15:51:14.169+00",
    fecha_inicio_real: "2026-08-17",
    fecha_fin_real: "2026-08-17",
    status_changed_at: "2026-08-12 15:51:14.474998+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1114,
    id_trato: 693,
    id_presupuesto: 699,
    nro_presupuesto: 20883,
    empresa: "COCA COLA FEMSA DE VENEZUELA, S.A",
    servicio: "EVALUACIÓN DE RIESGO DE TRÁFICO PEATONAL"
  },
  {
    id: 226,
    nro_osi_secuencial: "3447",
    id_estatus: 11,
    estatus_actual: "En Proceso",
    created_at: "2026-08-11 22:00:50.517869+00",
    fecha_emision: "2026-08-12 13:24:55.35+00",
    fecha_inicio_real: "2026-08-17",
    fecha_fin_real: "2026-08-17",
    status_changed_at: "2026-08-12 13:24:55.42754+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1012,
    id_trato: 614,
    id_presupuesto: 855,
    nro_presupuesto: 21039,
    empresa: "COCA COLA FEMSA DE VENEZUELA, S.A",
    servicio: "MATRIZ DE IDENTIFICACIÓN Y EVALUACIÓN DE RIESGOS (IPER)"
  },
  {
    id: 225,
    nro_osi_secuencial: "3448",
    id_estatus: 11,
    estatus_actual: "En Proceso",
    created_at: "2026-08-11 21:57:13.454667+00",
    fecha_emision: "2026-08-12 13:29:21.352+00",
    fecha_inicio_real: "2026-08-17",
    fecha_fin_real: "2026-08-17",
    status_changed_at: "2026-08-12 13:29:21.425721+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1396,
    id_trato: 839,
    id_presupuesto: 854,
    nro_presupuesto: 21038,
    empresa: "COCA COLA FEMSA DE VENEZUELA, S.A",
    servicio: "MATRIZ DE IDENTIFICACIÓN Y EVALUACIÓN DE RIESGOS (IPER)"
  },
  {
    id: 224,
    nro_osi_secuencial: "3449",
    id_estatus: 11,
    estatus_actual: "En Proceso",
    created_at: "2026-08-11 21:56:22.857383+00",
    fecha_emision: "2026-08-12 13:39:06.272+00",
    fecha_inicio_real: "2026-08-17",
    fecha_fin_real: "2026-08-17",
    status_changed_at: "2026-08-12 13:39:06.348304+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1211,
    id_trato: 744,
    id_presupuesto: 853,
    nro_presupuesto: 21037,
    empresa: "COCA COLA FEMSA DE VENEZUELA, S.A",
    servicio: "MATRIZ DE IDENTIFICACIÓN Y EVALUACIÓN DE RIESGOS (IPER)"
  },
  {
    id: 223,
    nro_osi_secuencial: "3450",
    id_estatus: 11,
    estatus_actual: "En Proceso",
    created_at: "2026-08-11 21:55:32.317897+00",
    fecha_emision: "2026-08-12 13:42:06.514+00",
    fecha_inicio_real: "2026-08-17",
    fecha_fin_real: "2026-08-17",
    status_changed_at: "2026-08-12 13:42:06.580779+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1154,
    id_trato: 713,
    id_presupuesto: 852,
    nro_presupuesto: 21036,
    empresa: "COCA COLA FEMSA DE VENEZUELA, S.A",
    servicio: "MATRIZ DE IDENTIFICACIÓN Y EVALUACIÓN DE RIESGOS (IPER)"
  },
  {
    id: 222,
    nro_osi_secuencial: "3451",
    id_estatus: 11,
    estatus_actual: "En Proceso",
    created_at: "2026-08-11 21:54:30.883703+00",
    fecha_emision: "2026-08-12 13:44:38.636+00",
    fecha_inicio_real: "2026-08-17",
    fecha_fin_real: "2026-08-17",
    status_changed_at: "2026-08-12 13:44:38.73731+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1153,
    id_trato: 712,
    id_presupuesto: 851,
    nro_presupuesto: 21035,
    empresa: "COCA COLA FEMSA DE VENEZUELA, S.A",
    servicio: "MATRIZ DE IDENTIFICACIÓN Y EVALUACIÓN DE RIESGOS (IPER)"
  },
  {
    id: 221,
    nro_osi_secuencial: "3446",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-11 21:04:55.027552+00",
    fecha_emision: "2026-08-11 21:07:47.086+00",
    fecha_inicio_real: "2026-08-12",
    fecha_fin_real: "2026-08-12",
    status_changed_at: "2026-08-12 18:40:08.128972+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1395,
    id_trato: 838,
    id_presupuesto: 856,
    nro_presupuesto: 21040,
    empresa: "SHA DE VENEZUELA",
    servicio: "PERMISO DE TRABAJO"
  },
  {
    id: 220,
    nro_osi_secuencial: "3445",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-11 20:00:36.371642+00",
    fecha_emision: "2026-08-11 20:02:41.784+00",
    fecha_inicio_real: "2026-08-12",
    fecha_fin_real: "2026-08-14",
    status_changed_at: "2026-08-18 20:49:07.498857+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1387,
    id_trato: 833,
    id_presupuesto: 847,
    nro_presupuesto: 21031,
    empresa: "NEW PROYECT CA",
    servicio: "SEGURIDAD, HIGIENE Y AMBIENTE MÓDULO SUPERVISORIO"
  },
  {
    id: 219,
    nro_osi_secuencial: "3443",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-11 17:33:38.998089+00",
    fecha_emision: "2026-08-11 18:17:02.803+00",
    fecha_inicio_real: "2026-08-12",
    fecha_fin_real: "2026-08-12",
    status_changed_at: "2026-08-18 20:51:47.311385+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 939,
    id_trato: 568,
    id_presupuesto: 584,
    nro_presupuesto: 20774,
    empresa: "COCA COLA FEMSA DE VENEZUELA, S.A",
    servicio: "SEGURIDAD EN TRABAJO ELÉCTRICO (BÁSICO ELÉCTRICO Y SUBESTACIÓN)"
  },
  {
    id: 218,
    nro_osi_secuencial: "3444",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-11 15:42:37.756629+00",
    fecha_emision: "2026-08-11 19:45:30.152+00",
    fecha_inicio_real: "2026-08-15",
    fecha_fin_real: "2026-08-16",
    status_changed_at: "2026-08-18 20:53:21.815597+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1274,
    id_trato: 774,
    id_presupuesto: 800,
    nro_presupuesto: 20984,
    empresa: "MUNDO MARINO R.S, C.A",
    servicio: "EXCELENCIA OPERACIONAL"
  },
  {
    id: 217,
    nro_osi_secuencial: "3441",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-11 14:35:04.656531+00",
    fecha_emision: "2026-08-11 14:46:56.998+00",
    fecha_inicio_real: "2026-08-18",
    fecha_fin_real: "2026-08-18",
    status_changed_at: "2026-08-19 15:10:35.615214+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1375,
    id_trato: 827,
    id_presupuesto: 840,
    nro_presupuesto: 21024,
    empresa: "SERVICIOS Y DISTRIBUCIONES DEL SUR  C A (SERDISURCA)",
    servicio: "MANEJO DEFENSIVO (EDUCACIÓN VIAL)"
  },
  {
    id: 216,
    nro_osi_secuencial: "3440",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-11 12:53:11.358541+00",
    fecha_emision: "2026-08-11 14:38:02.377+00",
    fecha_inicio_real: "2026-08-12",
    fecha_fin_real: "2026-08-12",
    status_changed_at: "2026-08-12 18:40:26.963492+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1376,
    id_trato: 827,
    id_presupuesto: 840,
    nro_presupuesto: 21024,
    empresa: "SERVICIOS Y DISTRIBUCIONES DEL SUR  C A (SERDISURCA)",
    servicio: "PERMISO DE TRABAJO"
  },
  {
    id: 215,
    nro_osi_secuencial: "3442",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-11 12:47:22.158561+00",
    fecha_emision: "2026-08-11 14:49:57.049+00",
    fecha_inicio_real: "2026-08-12",
    fecha_fin_real: "2026-08-12",
    status_changed_at: "2026-08-12 18:38:06.360224+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1373,
    id_trato: 825,
    id_presupuesto: 835,
    nro_presupuesto: 21019,
    empresa: "MC INGENIERIA DE SOLUCIONES AMBIENTALES, C.A.",
    servicio: "PERMISO DE TRABAJO"
  },
  {
    id: 214,
    nro_osi_secuencial: "3438",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-10 19:08:50.037868+00",
    fecha_emision: "2026-08-10 20:27:55.687+00",
    fecha_inicio_real: "0202-08-12",
    fecha_fin_real: "2026-08-12",
    status_changed_at: "2026-08-18 20:49:41.657021+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 974,
    id_trato: 591,
    id_presupuesto: 609,
    nro_presupuesto: 20811,
    empresa: "COCA COLA FEMSA DE VENEZUELA, S.A",
    servicio: "MANEJO DE GASES COMPRIMIDOS"
  },
  {
    id: 213,
    nro_osi_secuencial: "3437",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-07 20:40:48.380717+00",
    fecha_emision: "2026-08-07 20:41:41.254+00",
    fecha_inicio_real: "2026-08-10",
    fecha_fin_real: "2026-08-10",
    status_changed_at: "2026-08-10 19:20:19.240021+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1360,
    id_trato: 820,
    id_presupuesto: 831,
    nro_presupuesto: 21015,
    empresa: "TRANSPORTE MOISÉS, C.A",
    servicio: "MANEJO DEFENSIVO DE FLOTA PESADA"
  },
  {
    id: 212,
    nro_osi_secuencial: "3436",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-07 20:30:10.702859+00",
    fecha_emision: "2026-08-07 20:32:47.315+00",
    fecha_inicio_real: "2026-08-10",
    fecha_fin_real: "2026-08-10",
    status_changed_at: "2026-08-10 19:19:01.269579+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1361,
    id_trato: 821,
    id_presupuesto: 830,
    nro_presupuesto: 21014,
    empresa: "COCA COLA FEMSA DE VENEZUELA, S.A",
    servicio: "TRABAJO EN ALTURAS"
  },
  {
    id: 211,
    nro_osi_secuencial: "3468",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-07 16:05:56.437591+00",
    fecha_emision: "2026-08-18 17:33:06.521+00",
    fecha_inicio_real: "2026-08-29",
    fecha_fin_real: "2026-08-29",
    status_changed_at: "2026-09-23 02:03:53.707609+00",
    updated_at: "2026-09-23 02:03:53.707609+00",
    id_ecc: 1354,
    id_trato: 815,
    id_presupuesto: 826,
    nro_presupuesto: 21010,
    empresa: "LUBVENCA ORIENTE C.A.",
    servicio: "FUNDAMENTOS DE LA HIGIENE OCUPACIONAL"
  },
  {
    id: 210,
    nro_osi_secuencial: "3467",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-07 16:05:20.66592+00",
    fecha_emision: "2026-08-18 17:26:18.929+00",
    fecha_inicio_real: "2026-08-22",
    fecha_fin_real: "2026-08-22",
    status_changed_at: "2026-09-01 13:29:47.534227+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1352,
    id_trato: 815,
    id_presupuesto: 826,
    nro_presupuesto: 21010,
    empresa: "LUBVENCA ORIENTE C.A.",
    servicio: "SEGURIDAD EN ESPACIOS CONFINADOS"
  },
  {
    id: 209,
    nro_osi_secuencial: "3439",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-07 16:04:30.20779+00",
    fecha_emision: "2026-08-10 20:31:56.717+00",
    fecha_inicio_real: "2026-08-15",
    fecha_fin_real: "2026-08-15",
    status_changed_at: "2026-09-01 13:17:45.091985+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1351,
    id_trato: 815,
    id_presupuesto: 826,
    nro_presupuesto: 21010,
    empresa: "LUBVENCA ORIENTE C.A.",
    servicio: "TRABAJO EN ALTURAS"
  },
  {
    id: 208,
    nro_osi_secuencial: "3435",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-07 13:22:53.686006+00",
    fecha_emision: "2026-08-07 13:48:54.705+00",
    fecha_inicio_real: "2026-08-08",
    fecha_fin_real: "2026-08-09",
    status_changed_at: "2026-08-10 19:03:40.737825+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1074,
    id_trato: 662,
    id_presupuesto: 654,
    nro_presupuesto: 20838,
    empresa: "INDUSTRIAS DE ALIMENTOS EL TREBOL, S.A.",
    servicio: "MANEJO DE MONTACARGAS"
  },
  {
    id: 207,
    nro_osi_secuencial: "3433",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-06 20:02:23.819401+00",
    fecha_emision: "2026-08-06 20:03:28.66+00",
    fecha_inicio_real: "2026-08-07",
    fecha_fin_real: "2026-08-07",
    status_changed_at: "2026-08-10 19:00:04.833446+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1355,
    id_trato: 817,
    id_presupuesto: 825,
    nro_presupuesto: 21009,
    empresa: "NEW PROYECT CA",
    servicio: "EVALUACIÓN DE ATMÓSFERAS PELIGROSAS"
  },
  {
    id: 206,
    nro_osi_secuencial: "3434",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-06 20:01:31.133127+00",
    fecha_emision: "2026-08-06 20:06:52.886+00",
    fecha_inicio_real: "2026-08-07",
    fecha_fin_real: "2026-08-07",
    status_changed_at: "2026-08-10 19:02:39.373306+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1358,
    id_trato: 817,
    id_presupuesto: 825,
    nro_presupuesto: 21009,
    empresa: "NEW PROYECT CA",
    servicio: "MANEJO SEGURO DEL SULFURO DE HIDRÓGENO (H2S)"
  },
  {
    id: 205,
    nro_osi_secuencial: "3432",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-06 19:31:47.232331+00",
    fecha_emision: "2026-08-06 19:35:11.148+00",
    fecha_inicio_real: "2026-08-07",
    fecha_fin_real: "2026-08-07",
    status_changed_at: "2026-08-18 20:52:16.657471+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1317,
    id_trato: 795,
    id_presupuesto: 798,
    nro_presupuesto: 20982,
    empresa: "COCA COLA FEMSA DE VENEZUELA, S.A",
    servicio: "MANEJO DEFENSIVO DE FLOTA PESADA"
  },
  {
    id: 204,
    nro_osi_secuencial: "3431",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-06 14:05:19.238908+00",
    fecha_emision: "2026-08-06 14:16:49.91+00",
    fecha_inicio_real: "2026-08-06",
    fecha_fin_real: "2026-08-06",
    status_changed_at: "2026-08-10 18:59:37.18547+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1348,
    id_trato: 813,
    id_presupuesto: 822,
    nro_presupuesto: 21006,
    empresa: "NEW PROYECT CA",
    servicio: "MANEJO DEFENSIVO (EDUCACIÓN VIAL)"
  },
  {
    id: 203,
    nro_osi_secuencial: "3430",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-06 12:43:04.428087+00",
    fecha_emision: "2026-08-06 13:12:36.447+00",
    fecha_inicio_real: "2026-08-12",
    fecha_fin_real: "2026-08-12",
    status_changed_at: "2026-08-21 13:04:52.455393+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1309,
    id_trato: 793,
    id_presupuesto: 801,
    nro_presupuesto: 20985,
    empresa: "AVENRUT, C.A",
    servicio: "PRIMEROS AUXILIOS"
  },
  {
    id: 202,
    nro_osi_secuencial: "3429",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-06 12:38:40.704395+00",
    fecha_emision: "2026-08-06 12:41:41.651+00",
    fecha_inicio_real: "2026-08-11",
    fecha_fin_real: "2026-08-12",
    status_changed_at: "2026-08-18 20:51:03.96698+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1307,
    id_trato: 793,
    id_presupuesto: 801,
    nro_presupuesto: 20985,
    empresa: "AVENRUT, C.A",
    servicio: "PRIMEROS AUXILIOS"
  },
  {
    id: 201,
    nro_osi_secuencial: "3427",
    id_estatus: 11,
    estatus_actual: "En Proceso",
    created_at: "2026-08-05 15:54:07.964263+00",
    fecha_emision: "2026-08-05 15:59:33.676+00",
    fecha_inicio_real: "2026-08-07",
    fecha_fin_real: "2026-08-07",
    status_changed_at: "2026-08-05 15:59:33.757359+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1340,
    id_trato: 806,
    id_presupuesto: 820,
    nro_presupuesto: 20604,
    empresa: "COCA COLA FEMSA DE VENEZUELA, S.A",
    servicio: "PERMISO DE TRABAJO"
  },
  {
    id: 200,
    nro_osi_secuencial: "3428",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-05 15:48:54.372787+00",
    fecha_emision: "2026-08-05 16:01:47.597+00",
    fecha_inicio_real: "2026-08-06",
    fecha_fin_real: "2026-08-06",
    status_changed_at: "2026-08-10 18:59:49.791148+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1339,
    id_trato: 805,
    id_presupuesto: 819,
    nro_presupuesto: 20603,
    empresa: "COCA COLA FEMSA DE VENEZUELA, S.A",
    servicio: "PERMISO DE TRABAJO"
  },
  {
    id: 194,
    nro_osi_secuencial: "3425",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-05 14:43:10.842758+00",
    fecha_emision: "2026-08-05 15:10:12.849+00",
    fecha_inicio_real: "2026-08-08",
    fecha_fin_real: "2026-08-09",
    status_changed_at: "2026-08-10 19:03:12.435841+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1293,
    id_trato: 787,
    id_presupuesto: 794,
    nro_presupuesto: 20978,
    empresa: "MATERIALES Y SUMINISTROS PARAMACONI, C.A.",
    servicio: "EXCELENCIA OPERACIONAL"
  },
  {
    id: 193,
    nro_osi_secuencial: "3426",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-05 14:22:13.537579+00",
    fecha_emision: "2026-08-05 15:22:14.845+00",
    fecha_inicio_real: "2026-08-08",
    fecha_fin_real: "2026-08-09",
    status_changed_at: "2026-08-10 19:17:58.819992+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1291,
    id_trato: 785,
    id_presupuesto: 816,
    nro_presupuesto: 21000,
    empresa: "GMG GLOBAL C.A.",
    servicio: "EXCELENCIA OPERACIONAL"
  },
  {
    id: 192,
    nro_osi_secuencial: "3422",
    id_estatus: 11,
    estatus_actual: "En Proceso",
    created_at: "2026-08-05 13:35:39.191836+00",
    fecha_emision: "2026-08-05 13:59:15.863+00",
    fecha_inicio_real: "0202-08-06",
    fecha_fin_real: "2026-08-06",
    status_changed_at: "2026-08-05 13:59:15.955505+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 434,
    id_trato: 240,
    id_presupuesto: 240,
    nro_presupuesto: 20376,
    empresa: "COCA COLA FEMSA DE VENEZUELA, S.A",
    servicio: "MANEJO SEGURO DE MATERIALES PELIGROSOS"
  },
  {
    id: 191,
    nro_osi_secuencial: "3421",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-05 13:23:47.327945+00",
    fecha_emision: "2026-08-05 13:47:34.519+00",
    fecha_inicio_real: "2026-08-08",
    fecha_fin_real: "2026-08-08",
    status_changed_at: "2026-08-10 19:18:10.422172+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 988,
    id_trato: 600,
    id_presupuesto: 595,
    nro_presupuesto: 20797,
    empresa: "PROCESADORA DE ALIMENTOS RIO DE ORO",
    servicio: "BLOQUEO Y ETIQUETADO LOTO (LOTO-LOCK OUT TAG OUT)"
  },
  {
    id: 190,
    nro_osi_secuencial: "3420",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-04 20:53:45.807844+00",
    fecha_emision: "2026-08-04 20:55:31.554+00",
    fecha_inicio_real: "2026-08-05",
    fecha_fin_real: "2026-08-05",
    status_changed_at: "2026-08-10 18:59:11.926724+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1337,
    id_trato: 804,
    id_presupuesto: 817,
    nro_presupuesto: 21001,
    empresa: "NEW PROYECT CA",
    servicio: "PERMISO DE TRABAJO"
  },
  {
    id: 189,
    nro_osi_secuencial: "3423",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-04 20:51:30.291535+00",
    fecha_emision: "2026-08-05 14:05:16.397+00",
    fecha_inicio_real: "2026-08-08",
    fecha_fin_real: "2026-08-09",
    status_changed_at: "2026-08-10 19:03:29.711517+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1296,
    id_trato: 789,
    id_presupuesto: 803,
    nro_presupuesto: 20987,
    empresa: "INVERSIONES SUPEROFFICE SFA, C.A",
    servicio: "EXCELENCIA OPERACIONAL"
  },
  {
    id: 188,
    nro_osi_secuencial: "3419",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-03 19:51:48.039017+00",
    fecha_emision: "2026-08-03 20:02:16.4+00",
    fecha_inicio_real: "2026-08-04",
    fecha_fin_real: "2026-08-04",
    status_changed_at: "2026-08-05 17:14:28.522104+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1306,
    id_trato: 792,
    id_presupuesto: 797,
    nro_presupuesto: 20981,
    empresa: "NEW PROYECT CA",
    servicio: "TRABAJO EN ALTURAS"
  },
  {
    id: 187,
    nro_osi_secuencial: "3418",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-03 19:50:25.610387+00",
    fecha_emision: "2026-08-03 19:57:24.611+00",
    fecha_inicio_real: "2026-08-08",
    fecha_fin_real: "2026-08-09",
    status_changed_at: "2026-08-10 19:03:20.722406+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1285,
    id_trato: 782,
    id_presupuesto: 789,
    nro_presupuesto: 20973,
    empresa: "CORPORACIÓN JF, C.A.",
    servicio: "EXCELENCIA OPERACIONAL"
  },
  {
    id: 186,
    nro_osi_secuencial: "3417",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-08-03 19:49:06.640464+00",
    fecha_emision: "2026-08-03 19:50:58.453+00",
    fecha_inicio_real: "2026-08-08",
    fecha_fin_real: "2026-08-09",
    status_changed_at: "2026-08-10 19:03:03.955483+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1288,
    id_trato: 784,
    id_presupuesto: 788,
    nro_presupuesto: 20972,
    empresa: "CL INTERNATIONAL GROUP, C.A",
    servicio: "EXCELENCIA OPERACIONAL"
  },
  {
    id: 185,
    nro_osi_secuencial: "PEN-3523",
    id_estatus: 39,
    estatus_actual: "OSI NO EJECUTADA",
    created_at: "2026-08-03 14:57:20.5512+00",
    fecha_emision: null,
    fecha_inicio_real: "2026-08-08",
    fecha_fin_real: "2026-08-09",
    status_changed_at: "2026-09-09 13:09:21.413676+00",
    updated_at: "2026-09-09 13:13:16.779153+00",
    id_ecc: 1289,
    id_trato: 784,
    id_presupuesto: 788,
    nro_presupuesto: 20972,
    empresa: "CL INTERNATIONAL GROUP, C.A",
    servicio: "REFRIGERIO"
  },
  {
    id: 184,
    nro_osi_secuencial: "PEN-3522",
    id_estatus: 39,
    estatus_actual: "OSI NO EJECUTADA",
    created_at: "2026-08-03 14:53:10.577489+00",
    fecha_emision: null,
    fecha_inicio_real: "2026-08-08",
    fecha_fin_real: "2026-08-09",
    status_changed_at: "2026-09-09 13:09:27.408946+00",
    updated_at: "2026-09-09 13:13:16.779153+00",
    id_ecc: 1286,
    id_trato: 782,
    id_presupuesto: 789,
    nro_presupuesto: 20973,
    empresa: "CORPORACIÓN JF, C.A.",
    servicio: "REFRIGERIO"
  },
  {
    id: 183,
    nro_osi_secuencial: "3416",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-07-31 20:22:03.994783+00",
    fecha_emision: "2026-07-31 20:23:03.626+00",
    fecha_inicio_real: "2026-08-03",
    fecha_fin_real: "2026-08-03",
    status_changed_at: "2026-08-05 17:14:12.6629+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1223,
    id_trato: 747,
    id_presupuesto: 754,
    nro_presupuesto: 20938,
    empresa: "COCA COLA FEMSA DE VENEZUELA, S.A",
    servicio: "TRABAJO EN ALTURAS"
  },
  {
    id: 182,
    nro_osi_secuencial: "PEN-3521",
    id_estatus: 10,
    estatus_actual: "Pendiente",
    created_at: "2026-07-31 18:07:37.308518+00",
    fecha_emision: null,
    fecha_inicio_real: "2026-06-10",
    fecha_fin_real: "2026-06-10",
    status_changed_at: "2026-07-31 18:07:37.308518+00",
    updated_at: "2026-09-09 13:13:16.779153+00",
    id_ecc: 565,
    id_trato: 339,
    id_presupuesto: 339,
    nro_presupuesto: 20485,
    empresa: "COCA COLA FEMSA DE VENEZUELA, S.A",
    servicio: "PLAN DE EMERGENCIA Y DESALOJO"
  },
  {
    id: 181,
    nro_osi_secuencial: "3337",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-07-30 18:56:22.727697+00",
    fecha_emision: "2026-07-30 18:58:35.882+00",
    fecha_inicio_real: "2026-06-19",
    fecha_fin_real: "2026-06-19",
    status_changed_at: "2026-07-30 18:59:03.650699+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1037,
    id_trato: 632,
    id_presupuesto: 628,
    nro_presupuesto: 207730,
    empresa: "COCA COLA FEMSA DE VENEZUELA, S.A",
    servicio: "METODOLOGÍA 5S"
  },
  {
    id: 180,
    nro_osi_secuencial: "3401",
    id_estatus: 11,
    estatus_actual: "En Proceso",
    created_at: "2026-07-30 18:13:26.239219+00",
    fecha_emision: "2026-07-31 15:12:06.832+00",
    fecha_inicio_real: "2026-08-07",
    fecha_fin_real: "2026-08-07",
    status_changed_at: "2026-07-31 15:12:06.928958+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1198,
    id_trato: 736,
    id_presupuesto: 722,
    nro_presupuesto: 20906,
    empresa: "G3 LOGISTICA, C.A.",
    servicio: "EVALUACIÓN DE ILUMINACIÓN OCUPACIONAL"
  },
  {
    id: 179,
    nro_osi_secuencial: "3400",
    id_estatus: 11,
    estatus_actual: "En Proceso",
    created_at: "2026-07-30 17:52:45.625291+00",
    fecha_emision: "2026-07-31 15:16:17.918+00",
    fecha_inicio_real: "2026-08-07",
    fecha_fin_real: "2026-08-07",
    status_changed_at: "2026-07-31 15:16:17.985503+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1197,
    id_trato: 736,
    id_presupuesto: 721,
    nro_presupuesto: 20905,
    empresa: "G3 LOGISTICA, C.A.",
    servicio: "EVALUACIÓN DE ESTRÉS TÉRMICO POR CALOR"
  },
  {
    id: 178,
    nro_osi_secuencial: "33660",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-07-30 16:01:21.298225+00",
    fecha_emision: "2026-07-31 13:50:07.664+00",
    fecha_inicio_real: "2026-07-14",
    fecha_fin_real: "2026-07-15",
    status_changed_at: "2026-09-23 02:03:55.607+00",
    updated_at: "2026-09-23 02:03:55.717175+00",
    id_ecc: 1069,
    id_trato: 656,
    id_presupuesto: 650,
    nro_presupuesto: 20834,
    empresa: "MULTISERVICIOS LEFER, C.A",
    servicio: "REFRIGERIO"
  },
  {
    id: 177,
    nro_osi_secuencial: "3415",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-07-30 15:54:22.641717+00",
    fecha_emision: "2026-07-30 15:59:13.197+00",
    fecha_inicio_real: "2026-07-31",
    fecha_fin_real: "2026-07-31",
    status_changed_at: "2026-07-31 19:58:38.721867+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1246,
    id_trato: 759,
    id_presupuesto: 760,
    nro_presupuesto: 20944,
    empresa: "NEW PROYECT CA",
    servicio: "EVALUACIÓN DE ATMÓSFERAS PELIGROSAS"
  },
  {
    id: 176,
    nro_osi_secuencial: "3414",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-07-30 15:49:21.512711+00",
    fecha_emision: "2026-07-30 15:56:43.316+00",
    fecha_inicio_real: "2026-07-06",
    fecha_fin_real: "2026-07-06",
    status_changed_at: "2026-09-08 18:53:59.30829+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 467,
    id_trato: 272,
    id_presupuesto: 272,
    nro_presupuesto: 20416,
    empresa: "COCA COLA FEMSA DE VENEZUELA, S.A",
    servicio: "MANEJO DE MONTACARGAS"
  },
  {
    id: 175,
    nro_osi_secuencial: "PEN-3414",
    id_estatus: 10,
    estatus_actual: "Pendiente",
    created_at: "2026-07-30 15:25:08.950202+00",
    fecha_emision: null,
    fecha_inicio_real: "2026-06-30",
    fecha_fin_real: "2026-06-30",
    status_changed_at: "2026-07-30 15:25:08.950202+00",
    updated_at: "2026-07-30 15:25:10.232228+00",
    id_ecc: 470,
    id_trato: 275,
    id_presupuesto: 275,
    nro_presupuesto: 20419,
    empresa: "COCA COLA FEMSA DE VENEZUELA, S.A",
    servicio: "ANÁLISIS DE PELIGROS Y OPERABILIDAD (HAZOP)"
  },
  {
    id: 174,
    nro_osi_secuencial: "3412",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-07-29 20:35:35.047823+00",
    fecha_emision: "2026-07-29 20:40:43.435+00",
    fecha_inicio_real: "2026-07-30",
    fecha_fin_real: "2026-07-30",
    status_changed_at: "2026-07-31 19:58:32.62108+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1247,
    id_trato: 759,
    id_presupuesto: 760,
    nro_presupuesto: 20944,
    empresa: "NEW PROYECT CA",
    servicio: "MANEJO SEGURO DEL SULFURO DE HIDRÓGENO (H2S)"
  },
  {
    id: 173,
    nro_osi_secuencial: "3411",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-07-29 20:17:39.614584+00",
    fecha_emision: "2026-07-29 20:24:31.5+00",
    fecha_inicio_real: "2026-07-30",
    fecha_fin_real: "2026-07-30",
    status_changed_at: "2026-07-31 19:58:45.766275+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 940,
    id_trato: 568,
    id_presupuesto: 583,
    nro_presupuesto: 20776,
    empresa: "COCA COLA FEMSA DE VENEZUELA, S.A",
    servicio: "CONTROL DE ENERGÍA PELIGROSA (LOTO) Y GUARDAS DE SEGURIDAD"
  },
  {
    id: 172,
    nro_osi_secuencial: "3410",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-07-29 19:53:25.918344+00",
    fecha_emision: "2026-07-29 20:11:31.801+00",
    fecha_inicio_real: "2026-07-30",
    fecha_fin_real: "2026-08-06",
    status_changed_at: "2026-07-31 19:57:51.339348+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1213,
    id_trato: 745,
    id_presupuesto: 742,
    nro_presupuesto: 20926,
    empresa: "COCA COLA FEMSA DE VENEZUELA, S.A",
    servicio: "PERMISO DE TRABAJO"
  },
  {
    id: 171,
    nro_osi_secuencial: "3413",
    id_estatus: 11,
    estatus_actual: "En Proceso",
    created_at: "2026-07-29 14:50:04.49349+00",
    fecha_emision: "2026-07-30 15:16:45.289+00",
    fecha_inicio_real: "2026-08-05",
    fecha_fin_real: "2026-08-05",
    status_changed_at: "2026-07-30 15:16:45.596321+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1076,
    id_trato: 653,
    id_presupuesto: 655,
    nro_presupuesto: 20839,
    empresa: "CHOCOLATE KRON, C.A",
    servicio: "EVALUACIÓN DE POLVO TOTAL Y RESPIRABLE"
  },
  {
    id: 170,
    nro_osi_secuencial: "3407",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-07-28 13:44:21.665637+00",
    fecha_emision: "2026-07-28 14:15:57.356+00",
    fecha_inicio_real: "2026-07-28",
    fecha_fin_real: "2026-07-28",
    status_changed_at: "2026-07-31 19:57:41.972741+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1233,
    id_trato: 753,
    id_presupuesto: 732,
    nro_presupuesto: 20916,
    empresa: "INNOVATECH SUPPLY, C.A",
    servicio: "MANEJO SEGURO DEL SULFURO DE HIDRÓGENO (H2S)"
  },
  {
    id: 169,
    nro_osi_secuencial: "3408",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-07-28 13:21:24.998314+00",
    fecha_emision: "2026-07-29 12:42:38.446+00",
    fecha_inicio_real: "2026-08-01",
    fecha_fin_real: "2026-08-01",
    status_changed_at: "2026-08-05 17:13:44.515506+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 987,
    id_trato: 600,
    id_presupuesto: 595,
    nro_presupuesto: 20797,
    empresa: "PROCESADORA DE ALIMENTOS RIO DE ORO",
    servicio: "MANEJO SEGURO DE MATERIALES PELIGROSOS"
  },
  {
    id: 168,
    nro_osi_secuencial: "3409",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-07-27 19:13:51.752902+00",
    fecha_emision: "2026-07-29 12:44:38.248+00",
    fecha_inicio_real: "2026-08-01",
    fecha_fin_real: "2026-08-01",
    status_changed_at: "2026-08-05 17:13:58.349937+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1231,
    id_trato: 751,
    id_presupuesto: 729,
    nro_presupuesto: 20913,
    empresa: "LUBVENCA ORIENTE C.A.",
    servicio: "EVALUACIÓN DE ATMÓSFERAS PELIGROSAS"
  },
  {
    id: 167,
    nro_osi_secuencial: "3406",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-07-27 17:31:02.322681+00",
    fecha_emision: "2026-07-27 17:45:11.067+00",
    fecha_inicio_real: "2026-07-22",
    fecha_fin_real: "2026-07-22",
    status_changed_at: "2026-09-08 18:54:00.011621+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1187,
    id_trato: 729,
    id_presupuesto: 702,
    nro_presupuesto: 20886,
    empresa: "CIVIKA PRO,C.A",
    servicio: "PERMISO DE TRABAJO"
  },
  {
    id: 166,
    nro_osi_secuencial: "3405",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-07-27 17:29:15.64382+00",
    fecha_emision: "2026-07-27 17:39:49.82+00",
    fecha_inicio_real: "2026-07-26",
    fecha_fin_real: "2026-07-26",
    status_changed_at: "2026-07-31 19:59:56.283979+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1200,
    id_trato: 738,
    id_presupuesto: 723,
    nro_presupuesto: 20907,
    empresa: "CIVIKA PRO,C.A",
    servicio: "EVALUACIÓN DE ATMÓSFERAS PELIGROSAS"
  },
  {
    id: 165,
    nro_osi_secuencial: "3403",
    id_estatus: 12,
    estatus_actual: "Ejecutado",
    created_at: "2026-07-27 17:20:51.922378+00",
    fecha_emision: "2026-07-27 17:36:39.648+00",
    fecha_inicio_real: "2026-07-27",
    fecha_fin_real: "2026-07-27",
    status_changed_at: "2026-07-31 19:57:20.074275+00",
    updated_at: "2026-09-09 19:27:44.457532+00",
    id_ecc: 1091,
    id_trato: 676,
    id_presupuesto: 720,
    nro_presupuesto: 20904,
    empresa: "ANALISTAS E INSPECTORES VZLANOS  DE PETROLEO C.A",
    servicio: "MANEJO DEFENSIVO (EDUCACIÓN VIAL)"
  }
];

export default function RevisionOsisStandalone() {
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedEmpresa, setSelectedEmpresa] = useState<string>("ALL");
  const [selectedServicio, setSelectedServicio] = useState<string>("ALL");
  const [selectedMonth, setSelectedMonth] = useState<string>("ALL");
  const [selectedEmisionFilter, setSelectedEmisionFilter] = useState<string>("ALL");
  const [selectedOsiDetail, setSelectedOsiDetail] = useState<OsiRecord | null>(null);

  // Stats calculation
  const totalOsis = RAW_OSI_DATA.length;
  const ejecutadasCount = RAW_OSI_DATA.filter((o) => o.estatus_actual === "Ejecutado").length;
  const enProcesoCount = RAW_OSI_DATA.filter((o) => o.estatus_actual === "En Proceso").length;
  const pendientesCount = RAW_OSI_DATA.filter((o) => o.estatus_actual === "Pendiente").length;
  const noEjecutadasCount = RAW_OSI_DATA.filter((o) => o.estatus_actual === "OSI NO EJECUTADA").length;
  const emitidasCount = RAW_OSI_DATA.filter((o) => Boolean(o.fecha_emision)).length;

  const empresasList = useMemo(() => {
    return Array.from(new Set(RAW_OSI_DATA.map((o) => o.empresa))).sort();
  }, []);

  const serviciosList = useMemo(() => {
    return Array.from(new Set(RAW_OSI_DATA.map((o) => o.servicio))).sort();
  }, []);

  const monthsList = useMemo(() => {
    const months = new Set<string>();
    RAW_OSI_DATA.forEach((o) => {
      const d = o.fecha_inicio_real || o.created_at;
      if (d) months.add(d.substring(0, 7));
    });
    return Array.from(months).sort().reverse();
  }, []);

  const filteredData = useMemo(() => {
    const q = search.toLowerCase().trim();

    return RAW_OSI_DATA.filter((item) => {
      if (q) {
        const matchSearch =
          item.nro_osi_secuencial.toLowerCase().includes(q) ||
          item.empresa.toLowerCase().includes(q) ||
          item.servicio.toLowerCase().includes(q) ||
          String(item.nro_presupuesto).includes(q) ||
          String(item.id).includes(q);
        if (!matchSearch) return false;
      }

      if (selectedStatus !== "ALL" && item.estatus_actual !== selectedStatus) return false;
      if (selectedEmpresa !== "ALL" && item.empresa !== selectedEmpresa) return false;
      if (selectedServicio !== "ALL" && item.servicio !== selectedServicio) return false;

      if (selectedMonth !== "ALL") {
        const itemMonth = (item.fecha_inicio_real || item.created_at || "").substring(0, 7);
        if (itemMonth !== selectedMonth) return false;
      }

      if (selectedEmisionFilter === "EMITIDA" && !item.fecha_emision) return false;
      if (selectedEmisionFilter === "NO_EMITIDA" && item.fecha_emision) return false;

      return true;
    });
  }, [search, selectedStatus, selectedEmpresa, selectedServicio, selectedMonth, selectedEmisionFilter]);

  const handleExportCSV = () => {
    const headers = [
      "ID",
      "Nro OSI",
      "Estatus",
      "Empresa",
      "Servicio",
      "Nro Presupuesto",
      "Fecha Inicio Real",
      "Fecha Fin Real",
      "Fecha Emision",
      "Fecha Creacion",
      "Ultima Actualizacion",
      "ID ECC",
      "ID Trato",
      "ID Presupuesto"
    ];

    const rows = filteredData.map((d) => [
      d.id,
      `"${d.nro_osi_secuencial}"`,
      `"${d.estatus_actual}"`,
      `"${d.empresa}"`,
      `"${d.servicio}"`,
      d.nro_presupuesto,
      d.fecha_inicio_real || "",
      d.fecha_fin_real || "",
      d.fecha_emision ? d.fecha_emision.substring(0, 10) : "No emitida",
      d.created_at ? d.created_at.substring(0, 10) : "",
      d.updated_at ? d.updated_at.substring(0, 10) : "",
      d.id_ecc,
      d.id_trato,
      d.id_presupuesto
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `revision_gerencial_osis_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetFilters = () => {
    setSearch("");
    setSelectedStatus("ALL");
    setSelectedEmpresa("ALL");
    setSelectedServicio("ALL");
    setSelectedMonth("ALL");
    setSelectedEmisionFilter("ALL");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Ejecutado":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "En Proceso":
        return "bg-sky-50 text-sky-700 border-sky-200";
      case "Pendiente":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "OSI NO EJECUTADA":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-1.5 rounded-lg bg-sky-50 text-sky-600 border border-sky-100">
                <Sparkles className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Vista de Revisión Gerencial — OSIs Capacitación
              </h1>
              <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-amber-200">
                {RAW_OSI_DATA.length} Registros
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Panel independiente para revisión directa de estados, clientes, fechas de ejecución y presupuestos con la gerencia.
            </p>
          </div>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
          >
            <Download className="w-4 h-4" />
            Exportar a Excel (CSV)
          </button>
        </div>

        {/* KPI Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <p className="text-[11px] uppercase font-bold text-slate-400">Total OSIs</p>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-slate-900">{totalOsis}</span>
              <span className="text-xs text-slate-500 font-medium">100%</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
            <p className="text-[11px] uppercase font-bold text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Ejecutadas
            </p>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-emerald-800">{ejecutadasCount}</span>
              <span className="text-xs text-emerald-700 font-bold">
                {Math.round((ejecutadasCount / totalOsis) * 100)}%
              </span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-sky-200 bg-sky-50/20 shadow-xs">
            <p className="text-[11px] uppercase font-bold text-sky-700 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> En Proceso
            </p>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-sky-800">{enProcesoCount}</span>
              <span className="text-xs text-sky-700 font-bold">
                {Math.round((enProcesoCount / totalOsis) * 100)}%
              </span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-xs">
            <p className="text-[11px] uppercase font-bold text-amber-700 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> Pendientes
            </p>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-amber-800">{pendientesCount}</span>
              <span className="text-xs text-amber-700 font-bold">
                {Math.round((pendientesCount / totalOsis) * 100)}%
              </span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/20 shadow-xs">
            <p className="text-[11px] uppercase font-bold text-rose-700 flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5" /> No Ejecutadas
            </p>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-rose-800">{noEjecutadasCount}</span>
              <span className="text-xs text-rose-700 font-bold">
                {Math.round((noEjecutadasCount / totalOsis) * 100)}%
              </span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por OSI, Empresa, Servicio o N° Presupuesto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
                >
                  Limpiar
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">
                Mostrando: <strong>{filteredData.length}</strong> de {totalOsis}
              </span>
              {(search || selectedStatus !== "ALL" || selectedEmpresa !== "ALL" || selectedServicio !== "ALL" || selectedMonth !== "ALL" || selectedEmisionFilter !== "ALL") && (
                <button
                  onClick={resetFilters}
                  className="text-xs font-bold text-sky-600 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 px-3 py-1.5 rounded-lg transition"
                >
                  Restablecer Filtros
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                Estatus
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="ALL">Todos los Estatus</option>
                <option value="Ejecutado">✅ Ejecutado ({ejecutadasCount})</option>
                <option value="En Proceso">⏳ En Proceso ({enProcesoCount})</option>
                <option value="Pendiente">⚠️ Pendiente ({pendientesCount})</option>
                <option value="OSI NO EJECUTADA">❌ OSI NO EJECUTADA ({noEjecutadasCount})</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                Empresa / Cliente
              </label>
              <select
                value={selectedEmpresa}
                onChange={(e) => setSelectedEmpresa(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="ALL">Todas las Empresas ({empresasList.length})</option>
                {empresasList.map((emp) => (
                  <option key={emp} value={emp}>
                    {emp}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                Curso / Servicio
              </label>
              <select
                value={selectedServicio}
                onChange={(e) => setSelectedServicio(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="ALL">Todos los Cursos ({serviciosList.length})</option>
                {serviciosList.map((srv) => (
                  <option key={srv} value={srv}>
                    {srv}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                Mes de Inicio
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="ALL">Todos los Meses</option>
                {monthsList.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                Estado de Emisión
              </label>
              <select
                value={selectedEmisionFilter}
                onChange={(e) => setSelectedEmisionFilter(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="ALL">Todas las OSIs</option>
                <option value="EMITIDA">Con Fecha de Emisión ({emitidasCount})</option>
                <option value="NO_EMITIDA">Sin Emisión / Pendientes ({totalOsis - emitidasCount})</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3.5">OSI #</th>
                  <th className="px-4 py-3.5">Estatus</th>
                  <th className="px-4 py-3.5">Empresa / Cliente</th>
                  <th className="px-4 py-3.5">Servicio / Curso</th>
                  <th className="px-4 py-3.5">Presupuesto</th>
                  <th className="px-4 py-3.5">Fecha Ejecución</th>
                  <th className="px-4 py-3.5">Fecha Emisión</th>
                  <th className="px-4 py-3.5 text-right">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-400 font-medium">
                      No se encontraron registros que coincidan con los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedOsiDetail(item)}
                      className="hover:bg-sky-50/40 transition-colors cursor-pointer group"
                    >
                      <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">
                        <span
                          className={`font-mono text-xs px-2 py-0.5 rounded-md border ${
                            item.nro_osi_secuencial.startsWith("PEN-")
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : "bg-slate-100 text-slate-800 border-slate-200"
                          }`}
                        >
                          {item.nro_osi_secuencial}
                        </span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${getStatusBadge(
                            item.estatus_actual,
                          )}`}
                        >
                          {item.estatus_actual}
                        </span>
                      </td>

                      <td className="px-4 py-3 font-bold text-slate-800 max-w-[220px] truncate" title={item.empresa}>
                        {item.empresa}
                      </td>

                      <td className="px-4 py-3 text-slate-600 max-w-[240px] truncate" title={item.servicio}>
                        {item.servicio}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap font-mono text-slate-700 font-medium">
                        #{item.nro_presupuesto}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                        {item.fecha_inicio_real ? (
                          <div className="flex items-center gap-1 font-medium">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{item.fecha_inicio_real}</span>
                            {item.fecha_fin_real && item.fecha_fin_real !== item.fecha_inicio_real && (
                              <span className="text-slate-400 text-[10px]"> al {item.fecha_fin_real}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No fijada</span>
                        )}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                        {item.fecha_emision ? (
                          <span className="text-emerald-700 font-medium">
                            {item.fecha_emision.substring(0, 10)}
                          </span>
                        ) : (
                          <span className="text-amber-600 font-medium text-[11px] bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            Sin emitir
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOsiDetail(item);
                          }}
                          className="p-1 rounded-lg text-slate-400 group-hover:text-sky-600 group-hover:bg-sky-100 transition"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Detail */}
        {selectedOsiDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
            <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`font-mono text-sm font-bold px-2.5 py-1 rounded-lg border ${
                      selectedOsiDetail.nro_osi_secuencial.startsWith("PEN-")
                        ? "bg-amber-50 text-amber-800 border-amber-200"
                        : "bg-sky-50 text-sky-800 border-sky-200"
                    }`}
                  >
                    OSI #{selectedOsiDetail.nro_osi_secuencial}
                  </span>
                  <span
                    className={`text-xs font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${getStatusBadge(
                      selectedOsiDetail.estatus_actual,
                    )}`}
                  >
                    {selectedOsiDetail.estatus_actual}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedOsiDetail(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                    Información del Servicio
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[11px] text-slate-400 block font-semibold">Empresa / Cliente</span>
                      <span className="text-sm font-bold text-slate-900">{selectedOsiDetail.empresa}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block font-semibold">Curso / Servicio</span>
                      <span className="text-sm font-bold text-slate-900">{selectedOsiDetail.servicio}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Fecha Inicio Real</span>
                    <span className="text-xs font-bold text-slate-800 font-mono mt-0.5 block">
                      {selectedOsiDetail.fecha_inicio_real || "N/A"}
                    </span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Fecha Fin Real</span>
                    <span className="text-xs font-bold text-slate-800 font-mono mt-0.5 block">
                      {selectedOsiDetail.fecha_fin_real || "N/A"}
                    </span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Fecha Emisión</span>
                    <span className="text-xs font-bold text-slate-800 font-mono mt-0.5 block">
                      {selectedOsiDetail.fecha_emision ? selectedOsiDetail.fecha_emision.substring(0, 10) : "No emitida"}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                  <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                    Trazabilidad Comercial & Sistema
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 block font-bold">N° Presupuesto</span>
                      <span className="text-xs font-mono font-bold text-slate-900">
                        #{selectedOsiDetail.nro_presupuesto}
                      </span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 block font-bold">ID Trato</span>
                      <span className="text-xs font-mono font-bold text-slate-900">
                        {selectedOsiDetail.id_trato}
                      </span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 block font-bold">ID ECC</span>
                      <span className="text-xs font-mono font-bold text-slate-900">
                        {selectedOsiDetail.id_ecc}
                      </span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 block font-bold">ID Registro</span>
                      <span className="text-xs font-mono font-bold text-slate-900">
                        {selectedOsiDetail.id}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p>
                    <strong>Creado el:</strong> {selectedOsiDetail.created_at}
                  </p>
                  <p>
                    <strong>Cambio de estado:</strong> {selectedOsiDetail.status_changed_at || "N/A"}
                  </p>
                  <p>
                    <strong>Última actualización:</strong> {selectedOsiDetail.updated_at || "N/A"}
                  </p>
                </div>
              </div>

              <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedOsiDetail(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold transition text-xs"
                >
                  Cerrar Detalle
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
