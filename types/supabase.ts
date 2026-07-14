export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1";
  };
  public: {
    Tables: {
      carnets: {
        Row: {
          cedula_participante: string;
          created_at: string | null;
          empresa_participante: string | null;
          fecha_emision: string;
          fecha_vencimiento: string | null;
          id: number;
          id_certificado: number | null;
          id_curso: number | null;
          id_empresa: number | null;
          id_osi: number | null;
          id_participante: number | null;
          is_active: boolean;
          nombre_participante: string;
          qr_code: string | null;
          snapshot_contenido: string | null;
          titulo_curso: string;
        };
        Insert: {
          cedula_participante: string;
          created_at?: string | null;
          empresa_participante?: string | null;
          fecha_emision?: string;
          fecha_vencimiento?: string | null;
          id?: number;
          id_certificado?: number | null;
          id_curso?: number | null;
          id_empresa?: number | null;
          id_osi?: number | null;
          id_participante?: number | null;
          is_active?: boolean;
          nombre_participante: string;
          qr_code?: string | null;
          snapshot_contenido?: string | null;
          titulo_curso: string;
        };
        Update: {
          cedula_participante?: string;
          created_at?: string | null;
          empresa_participante?: string | null;
          fecha_emision?: string;
          fecha_vencimiento?: string | null;
          id?: number;
          id_certificado?: number | null;
          id_curso?: number | null;
          id_empresa?: number | null;
          id_osi?: number | null;
          id_participante?: number | null;
          is_active?: boolean;
          nombre_participante?: string;
          qr_code?: string | null;
          snapshot_contenido?: string | null;
          titulo_curso?: string;
        };
        Relationships: [
          {
            foreignKeyName: "carnets_id_certificado_fkey";
            columns: ["id_certificado"];
            isOneToOne: true;
            referencedRelation: "certificados";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "carnets_id_curso_fkey";
            columns: ["id_curso"];
            isOneToOne: false;
            referencedRelation: "cursos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "carnets_id_empresa_fkey";
            columns: ["id_empresa"];
            isOneToOne: false;
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "carnets_id_empresa_fkey";
            columns: ["id_empresa"];
            isOneToOne: false;
            referencedRelation: "v_osi_formato_completo";
            referencedColumns: ["id_empresa"];
          },
          {
            foreignKeyName: "carnets_id_participante_fkey";
            columns: ["id_participante"];
            isOneToOne: false;
            referencedRelation: "participantes_certificados";
            referencedColumns: ["id"];
          },
        ];
      };
      cat_ciudades: {
        Row: {
          id: number;
          id_estado: number | null;
          nombre_ciudad: string;
        };
        Insert: {
          id?: number;
          id_estado?: number | null;
          nombre_ciudad: string;
        };
        Update: {
          id?: number;
          id_estado?: number | null;
          nombre_ciudad?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cat_ciudades_id_estado_fkey";
            columns: ["id_estado"];
            isOneToOne: false;
            referencedRelation: "cat_estados_venezuela";
            referencedColumns: ["id"];
          },
        ];
      };
      cat_estados_venezuela: {
        Row: {
          capital_estado: string | null;
          id: number;
          id_region: number | null;
          nombre_estado: string;
        };
        Insert: {
          capital_estado?: string | null;
          id?: number;
          id_region?: number | null;
          nombre_estado: string;
        };
        Update: {
          capital_estado?: string | null;
          id?: number;
          id_region?: number | null;
          nombre_estado?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cat_estados_venezuela_id_region_fkey";
            columns: ["id_region"];
            isOneToOne: false;
            referencedRelation: "cat_regiones";
            referencedColumns: ["id"];
          },
        ];
      };
      cat_origenes: {
        Row: {
          id: number;
          id_empleado_asignado: number | null;
          identificador: string | null;
          medio: string;
        };
        Insert: {
          id?: number;
          id_empleado_asignado?: number | null;
          identificador?: string | null;
          medio: string;
        };
        Update: {
          id?: number;
          id_empleado_asignado?: number | null;
          identificador?: string | null;
          medio?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cat_origenes_id_empleado_fkey";
            columns: ["id_empleado_asignado"];
            isOneToOne: false;
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          },
        ];
      };
      cat_regiones: {
        Row: {
          id: number;
          nombre_region: string;
        };
        Insert: {
          id?: number;
          nombre_region: string;
        };
        Update: {
          id?: number;
          nombre_region?: string;
        };
        Relationships: [];
      };
      catalogo_servicios: {
        Row: {
          carga_horaria_std: number | null;
          cliente_asociado: number | null;
          contenido_curso: string | null;
          created_at: string | null;
          esta_activo: boolean | null;
          id: number;
          id_departamento_ejecutante: number | null;
          nombre: string;
          tipo_servicio: number | null;
        };
        Insert: {
          carga_horaria_std?: number | null;
          cliente_asociado?: number | null;
          contenido_curso?: string | null;
          created_at?: string | null;
          esta_activo?: boolean | null;
          id?: number;
          id_departamento_ejecutante?: number | null;
          nombre: string;
          tipo_servicio?: number | null;
        };
        Update: {
          carga_horaria_std?: number | null;
          cliente_asociado?: number | null;
          contenido_curso?: string | null;
          created_at?: string | null;
          esta_activo?: boolean | null;
          id?: number;
          id_departamento_ejecutante?: number | null;
          nombre?: string;
          tipo_servicio?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "catalogo_servicios_cliente_asociado_fkey";
            columns: ["cliente_asociado"];
            isOneToOne: false;
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "catalogo_servicios_cliente_asociado_fkey";
            columns: ["cliente_asociado"];
            isOneToOne: false;
            referencedRelation: "v_osi_formato_completo";
            referencedColumns: ["id_empresa"];
          },
          {
            foreignKeyName: "catalogo_servicios_tipo_servicio_fkey";
            columns: ["tipo_servicio"];
            isOneToOne: false;
            referencedRelation: "tipo_servicio";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "servicios_catalogo_id_departamento_ejecutante_fkey";
            columns: ["id_departamento_ejecutante"];
            isOneToOne: false;
            referencedRelation: "departamentos";
            referencedColumns: ["id"];
          },
        ];
      };
      certificados: {
        Row: {
          calificacion: number;
          created_at: string | null;
          fecha_emision: string | null;
          fecha_vencimiento: string | null;
          id: number;
          id_curso: number | null;
          id_empresa: number | null;
          id_estado: number | null;
          id_facilitador: number | null;
          id_participante: number | null;
          id_plantilla_carnet: number | null;
          id_plantilla_certificado: number | null;
          is_active: boolean;
          nro_control: number;
          nro_hoja: number | null;
          nro_libro: number | null;
          nro_linea: number | null;
          nro_osi: number | null;
          qr_code: string | null;
          snapshot_contenido: string | null;
        };
        Insert: {
          calificacion?: number;
          created_at?: string | null;
          fecha_emision?: string | null;
          fecha_vencimiento?: string | null;
          id?: number;
          id_curso?: number | null;
          id_empresa?: number | null;
          id_estado?: number | null;
          id_facilitador?: number | null;
          id_participante?: number | null;
          id_plantilla_carnet?: number | null;
          id_plantilla_certificado?: number | null;
          is_active?: boolean;
          nro_control: number;
          nro_hoja?: number | null;
          nro_libro?: number | null;
          nro_linea?: number | null;
          nro_osi?: number | null;
          qr_code?: string | null;
          snapshot_contenido?: string | null;
        };
        Update: {
          calificacion?: number;
          created_at?: string | null;
          fecha_emision?: string | null;
          fecha_vencimiento?: string | null;
          id?: number;
          id_curso?: number | null;
          id_empresa?: number | null;
          id_estado?: number | null;
          id_facilitador?: number | null;
          id_participante?: number | null;
          id_plantilla_carnet?: number | null;
          id_plantilla_certificado?: number | null;
          is_active?: boolean;
          nro_control?: number;
          nro_hoja?: number | null;
          nro_libro?: number | null;
          nro_linea?: number | null;
          nro_osi?: number | null;
          qr_code?: string | null;
          snapshot_contenido?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "certificados_id_curso_fkey";
            columns: ["id_curso"];
            isOneToOne: false;
            referencedRelation: "cursos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "certificados_id_empresa_fkey";
            columns: ["id_empresa"];
            isOneToOne: false;
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "certificados_id_empresa_fkey";
            columns: ["id_empresa"];
            isOneToOne: false;
            referencedRelation: "v_osi_formato_completo";
            referencedColumns: ["id_empresa"];
          },
          {
            foreignKeyName: "certificados_id_estado_fkey";
            columns: ["id_estado"];
            isOneToOne: false;
            referencedRelation: "cat_estados_venezuela";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "certificados_id_facilitador_fkey";
            columns: ["id_facilitador"];
            isOneToOne: false;
            referencedRelation: "facilitadores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "certificados_id_participante_fkey";
            columns: ["id_participante"];
            isOneToOne: false;
            referencedRelation: "participantes_certificados";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "certificados_id_plantilla_carnet_fkey";
            columns: ["id_plantilla_carnet"];
            isOneToOne: false;
            referencedRelation: "plantillas_carnets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "certificados_id_plantilla_certificado_fkey";
            columns: ["id_plantilla_certificado"];
            isOneToOne: false;
            referencedRelation: "plantillas_certificados";
            referencedColumns: ["id"];
          },
        ];
      };
      clientes: {
        Row: {
          codigo_cliente: number | null;
          created_at: string | null;
          direccion_ejecucion: string | null;
          direccion_envio: string | null;
          direccion_fiscal: string | null;
          ejecutivo_negocios: string | null;
          email: string | null;
          empresa: string | null;
          estado: string | null;
          fecha: string | null;
          id: number;
          medio_atraccion: string | null;
          nombre_fiscal: string | null;
          nro_contacto: string | null;
          observaciones: string | null;
          responsable_ejecucion: string | null;
          rif: string | null;
          solicitante: string | null;
          telefono: string | null;
          zona: string | null;
        };
        Insert: {
          codigo_cliente?: number | null;
          created_at?: string | null;
          direccion_ejecucion?: string | null;
          direccion_envio?: string | null;
          direccion_fiscal?: string | null;
          ejecutivo_negocios?: string | null;
          email?: string | null;
          empresa?: string | null;
          estado?: string | null;
          fecha?: string | null;
          id?: never;
          medio_atraccion?: string | null;
          nombre_fiscal?: string | null;
          nro_contacto?: string | null;
          observaciones?: string | null;
          responsable_ejecucion?: string | null;
          rif?: string | null;
          solicitante?: string | null;
          telefono?: string | null;
          zona?: string | null;
        };
        Update: {
          codigo_cliente?: number | null;
          created_at?: string | null;
          direccion_ejecucion?: string | null;
          direccion_envio?: string | null;
          direccion_fiscal?: string | null;
          ejecutivo_negocios?: string | null;
          email?: string | null;
          empresa?: string | null;
          estado?: string | null;
          fecha?: string | null;
          id?: never;
          medio_atraccion?: string | null;
          nombre_fiscal?: string | null;
          nro_contacto?: string | null;
          observaciones?: string | null;
          responsable_ejecucion?: string | null;
          rif?: string | null;
          solicitante?: string | null;
          telefono?: string | null;
          zona?: string | null;
        };
        Relationships: [];
      };
      competencias_facilitador: {
        Row: {
          id: number;
          id_facilitador: number | null;
          id_servicio: number | null;
        };
        Insert: {
          id?: number;
          id_facilitador?: number | null;
          id_servicio?: number | null;
        };
        Update: {
          id?: number;
          id_facilitador?: number | null;
          id_servicio?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "competencias_facilitador_id_facilitador_fkey";
            columns: ["id_facilitador"];
            isOneToOne: false;
            referencedRelation: "facilitadores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "competencias_facilitador_id_servicio_fkey";
            columns: ["id_servicio"];
            isOneToOne: false;
            referencedRelation: "catalogo_servicios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "competencias_facilitador_id_servicio_fkey";
            columns: ["id_servicio"];
            isOneToOne: false;
            referencedRelation: "v_osi_formato_completo";
            referencedColumns: ["id_servicio"];
          },
        ];
      };
      condiciones_ambientales: {
        Row: {
          humedad_equipo_adecuada: string | null;
          humedad_lab_ideal: string | null;
          id_equipo: number;
          observaciones_ambientales: string | null;
          temp_equipo_adecuada: string | null;
          temp_lab_ideal: string | null;
        };
        Insert: {
          humedad_equipo_adecuada?: string | null;
          humedad_lab_ideal?: string | null;
          id_equipo: number;
          observaciones_ambientales?: string | null;
          temp_equipo_adecuada?: string | null;
          temp_lab_ideal?: string | null;
        };
        Update: {
          humedad_equipo_adecuada?: string | null;
          humedad_lab_ideal?: string | null;
          id_equipo?: number;
          observaciones_ambientales?: string | null;
          temp_equipo_adecuada?: string | null;
          temp_lab_ideal?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "condiciones_ambientales_id_equipo_fkey";
            columns: ["id_equipo"];
            isOneToOne: true;
            referencedRelation: "equipos";
            referencedColumns: ["id"];
          },
        ];
      };
      conf_clasificadores: {
        Row: {
          atributo_referencia: string;
          definicion: string;
          descripcion: string | null;
          esta_activo: boolean | null;
          id: number;
          tabla_referencia: string;
        };
        Insert: {
          atributo_referencia: string;
          definicion: string;
          descripcion?: string | null;
          esta_activo?: boolean | null;
          id?: number;
          tabla_referencia: string;
        };
        Update: {
          atributo_referencia?: string;
          definicion?: string;
          descripcion?: string | null;
          esta_activo?: boolean | null;
          id?: number;
          tabla_referencia?: string;
        };
        Relationships: [];
      };
      conf_estatus: {
        Row: {
          atributo_referencia: string | null;
          color_hex: string | null;
          definicion: string | null;
          descripcion: string | null;
          es_estado_final: boolean | null;
          id: number;
          nombre_estado: string;
          orden: number | null;
          tabla_referencia: string;
        };
        Insert: {
          atributo_referencia?: string | null;
          color_hex?: string | null;
          definicion?: string | null;
          descripcion?: string | null;
          es_estado_final?: boolean | null;
          id?: number;
          nombre_estado: string;
          orden?: number | null;
          tabla_referencia: string;
        };
        Update: {
          atributo_referencia?: string | null;
          color_hex?: string | null;
          definicion?: string | null;
          descripcion?: string | null;
          es_estado_final?: boolean | null;
          id?: number;
          nombre_estado?: string;
          orden?: number | null;
          tabla_referencia?: string;
        };
        Relationships: [];
      };
      contactos: {
        Row: {
          apellido: string | null;
          cargo: string | null;
          cedula_rif_personal: string | null;
          direccion_personal: string | null;
          email: string | null;
          email2: string | null;
          es_cliente: boolean;
          es_decisor: boolean | null;
          esta_activo: boolean | null;
          fecha_creacion: string | null;
          id: number;
          id_ejecutivo_owner: number | null;
          id_empresa: number | null;
          id_estado_ubicacion: number | null;
          id_estatus: number | null;
          nombre: string;
          telefono: string | null;
          tipo_cliente: string | null;
        };
        Insert: {
          apellido?: string | null;
          cargo?: string | null;
          cedula_rif_personal?: string | null;
          direccion_personal?: string | null;
          email?: string | null;
          email2?: string | null;
          es_cliente?: boolean;
          es_decisor?: boolean | null;
          esta_activo?: boolean | null;
          fecha_creacion?: string | null;
          id?: number;
          id_ejecutivo_owner?: number | null;
          id_empresa?: number | null;
          id_estado_ubicacion?: number | null;
          id_estatus?: number | null;
          nombre: string;
          telefono?: string | null;
          tipo_cliente?: string | null;
        };
        Update: {
          apellido?: string | null;
          cargo?: string | null;
          cedula_rif_personal?: string | null;
          direccion_personal?: string | null;
          email?: string | null;
          email2?: string | null;
          es_cliente?: boolean;
          es_decisor?: boolean | null;
          esta_activo?: boolean | null;
          fecha_creacion?: string | null;
          id?: number;
          id_ejecutivo_owner?: number | null;
          id_empresa?: number | null;
          id_estado_ubicacion?: number | null;
          id_estatus?: number | null;
          nombre?: string;
          telefono?: string | null;
          tipo_cliente?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "contactos_id_ejecutivo_owner_fkey";
            columns: ["id_ejecutivo_owner"];
            isOneToOne: false;
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contactos_id_empresa_fkey";
            columns: ["id_empresa"];
            isOneToOne: false;
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contactos_id_empresa_fkey";
            columns: ["id_empresa"];
            isOneToOne: false;
            referencedRelation: "v_osi_formato_completo";
            referencedColumns: ["id_empresa"];
          },
          {
            foreignKeyName: "contactos_id_estado_ubicacion_fkey";
            columns: ["id_estado_ubicacion"];
            isOneToOne: false;
            referencedRelation: "cat_estados_venezuela";
            referencedColumns: ["id"];
          },
        ];
      };
      cursos: {
        Row: {
          contenido: string | null;
          created_at: string | null;
          emite_carnet: boolean | null;
          horas_estimadas: number | null;
          id: number;
          is_active: boolean;
          nombre: string;
          nota_aprobatoria: number | null;
        };
        Insert: {
          contenido?: string | null;
          created_at?: string | null;
          emite_carnet?: boolean | null;
          horas_estimadas?: number | null;
          id?: number;
          is_active?: boolean;
          nombre: string;
          nota_aprobatoria?: number | null;
        };
        Update: {
          contenido?: string | null;
          created_at?: string | null;
          emite_carnet?: boolean | null;
          horas_estimadas?: number | null;
          id?: number;
          is_active?: boolean;
          nombre?: string;
          nota_aprobatoria?: number | null;
        };
        Relationships: [];
      };
      datos_bancarios: {
        Row: {
          banco: string;
          cedula_titular: string | null;
          es_principal: boolean | null;
          id: number;
          id_empleado: number | null;
          id_empresa: number | null;
          id_facilitador: number | null;
          id_proveedor: number | null;
          nro_cuenta: string;
          telefono_pago_movil: string | null;
        };
        Insert: {
          banco: string;
          cedula_titular?: string | null;
          es_principal?: boolean | null;
          id?: number;
          id_empleado?: number | null;
          id_empresa?: number | null;
          id_facilitador?: number | null;
          id_proveedor?: number | null;
          nro_cuenta: string;
          telefono_pago_movil?: string | null;
        };
        Update: {
          banco?: string;
          cedula_titular?: string | null;
          es_principal?: boolean | null;
          id?: number;
          id_empleado?: number | null;
          id_empresa?: number | null;
          id_facilitador?: number | null;
          id_proveedor?: number | null;
          nro_cuenta?: string;
          telefono_pago_movil?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "datos_bancarios_id_empleado_fkey";
            columns: ["id_empleado"];
            isOneToOne: false;
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "datos_bancarios_id_empresa_fkey";
            columns: ["id_empresa"];
            isOneToOne: false;
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "datos_bancarios_id_empresa_fkey";
            columns: ["id_empresa"];
            isOneToOne: false;
            referencedRelation: "v_osi_formato_completo";
            referencedColumns: ["id_empresa"];
          },
          {
            foreignKeyName: "datos_bancarios_id_facilitador_fkey";
            columns: ["id_facilitador"];
            isOneToOne: false;
            referencedRelation: "facilitadores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "datos_bancarios_id_proveedor_fkey";
            columns: ["id_proveedor"];
            isOneToOne: false;
            referencedRelation: "proveedores";
            referencedColumns: ["id"];
          },
        ];
      };
      departamentos: {
        Row: {
          descripcion: string | null;
          esta_activo: boolean | null;
          id: number;
          nombre: string;
        };
        Insert: {
          descripcion?: string | null;
          esta_activo?: boolean | null;
          id?: number;
          nombre: string;
        };
        Update: {
          descripcion?: string | null;
          esta_activo?: boolean | null;
          id?: number;
          nombre?: string;
        };
        Relationships: [];
      };
      direcciones_cliente: {
        Row: {
          direccion_exacta: string;
          id: number;
          id_ciudad: number | null;
          id_empresa: number;
          id_estado: number | null;
          nombre_etiqueta: string | null;
        };
        Insert: {
          direccion_exacta: string;
          id?: number;
          id_ciudad?: number | null;
          id_empresa: number;
          id_estado?: number | null;
          nombre_etiqueta?: string | null;
        };
        Update: {
          direccion_exacta?: string;
          id?: number;
          id_ciudad?: number | null;
          id_empresa?: number;
          id_estado?: number | null;
          nombre_etiqueta?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "direcciones_cliente_id_ciudad_fkey";
            columns: ["id_ciudad"];
            isOneToOne: false;
            referencedRelation: "cat_ciudades";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "direcciones_cliente_id_estado_fkey";
            columns: ["id_estado"];
            isOneToOne: false;
            referencedRelation: "cat_estados_venezuela";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_direcciones_empresa";
            columns: ["id_empresa"];
            isOneToOne: false;
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_direcciones_empresa";
            columns: ["id_empresa"];
            isOneToOne: false;
            referencedRelation: "v_osi_formato_completo";
            referencedColumns: ["id_empresa"];
          },
        ];
      };
      ecc_catalogo_costos: {
        Row: {
          costo_unitario_base: number | null;
          esta_activo: boolean | null;
          id: number;
          id_categoria: number | null;
          id_tipo_calculo: number | null;
          id_unidad: number | null;
          mapeo_recurso_osi: string | null;
          nombre_item: string;
        };
        Insert: {
          costo_unitario_base?: number | null;
          esta_activo?: boolean | null;
          id?: number;
          id_categoria?: number | null;
          id_tipo_calculo?: number | null;
          id_unidad?: number | null;
          mapeo_recurso_osi?: string | null;
          nombre_item: string;
        };
        Update: {
          costo_unitario_base?: number | null;
          esta_activo?: boolean | null;
          id?: number;
          id_categoria?: number | null;
          id_tipo_calculo?: number | null;
          id_unidad?: number | null;
          mapeo_recurso_osi?: string | null;
          nombre_item?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fk_cat_costos_calculo";
            columns: ["id_tipo_calculo"];
            isOneToOne: false;
            referencedRelation: "conf_clasificadores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_cat_costos_categoria";
            columns: ["id_categoria"];
            isOneToOne: false;
            referencedRelation: "conf_clasificadores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_cat_costos_unidad";
            columns: ["id_unidad"];
            isOneToOne: false;
            referencedRelation: "conf_clasificadores";
            referencedColumns: ["id"];
          },
        ];
      };
      ecc_config_margenes: {
        Row: {
          esta_activo: boolean | null;
          id: number;
          id_tipo_calculo: number | null;
          nombre_margen: string | null;
          porcentaje: number | null;
        };
        Insert: {
          esta_activo?: boolean | null;
          id?: number;
          id_tipo_calculo?: number | null;
          nombre_margen?: string | null;
          porcentaje?: number | null;
        };
        Update: {
          esta_activo?: boolean | null;
          id?: number;
          id_tipo_calculo?: number | null;
          nombre_margen?: string | null;
          porcentaje?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "fk_margenes_tipo_calculo";
            columns: ["id_tipo_calculo"];
            isOneToOne: false;
            referencedRelation: "conf_clasificadores";
            referencedColumns: ["id"];
          },
        ];
      };
      ecc_detalle_lineas: {
        Row: {
          aplica: boolean | null;
          cantidad: number | null;
          concepto_linea: string | null;
          costo_aplicado: number | null;
          id: number;
          id_ecc: number | null;
          id_item_costo: number | null;
          precio_aplicado: number | null;
          subtotal_costo: number | null;
        };
        Insert: {
          aplica?: boolean | null;
          cantidad?: number | null;
          concepto_linea?: string | null;
          costo_aplicado?: number | null;
          id?: number;
          id_ecc?: number | null;
          id_item_costo?: number | null;
          precio_aplicado?: number | null;
          subtotal_costo?: number | null;
        };
        Update: {
          aplica?: boolean | null;
          cantidad?: number | null;
          concepto_linea?: string | null;
          costo_aplicado?: number | null;
          id?: number;
          id_ecc?: number | null;
          id_item_costo?: number | null;
          precio_aplicado?: number | null;
          subtotal_costo?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "ecc_detalle_lineas_id_ecc_fkey";
            columns: ["id_ecc"];
            isOneToOne: false;
            referencedRelation: "ecc_encabezado";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ecc_detalle_lineas_id_ecc_fkey";
            columns: ["id_ecc"];
            isOneToOne: false;
            referencedRelation: "v_ecc_preview_context";
            referencedColumns: ["ecc_id"];
          },
          {
            foreignKeyName: "ecc_detalle_lineas_id_ecc_fkey";
            columns: ["id_ecc"];
            isOneToOne: false;
            referencedRelation: "v_ecc_resumen";
            referencedColumns: ["id_ecc"];
          },
          {
            foreignKeyName: "ecc_detalle_lineas_id_ecc_fkey";
            columns: ["id_ecc"];
            isOneToOne: false;
            referencedRelation: "v_funnel_comercial_detallado";
            referencedColumns: ["ecc_id"];
          },
          {
            foreignKeyName: "ecc_detalle_lineas_id_item_costo_fkey";
            columns: ["id_item_costo"];
            isOneToOne: false;
            referencedRelation: "ecc_catalogo_costos";
            referencedColumns: ["id"];
          },
        ];
      };
      ecc_encabezado: {
        Row: {
          audiovisuales: boolean | null;
          espacio: boolean;
          fecha_aprobacion: string | null;
          fecha_ejecucion_servicio: string | null;
          fecha_solicitud: string | null;
          horas_totales: number | null;
          id: number;
          id_direccion_ejecucion_solped: number | null;
          id_direccion_envio_solped: number | null;
          id_estatus: number | null;
          id_modalidad: number | null;
          id_servicio: number | null;
          id_trato: number | null;
          motivo_rechazo: string | null;
          nro_ecc: number | null;
          nro_solped: number | null;
          observaciones_cliente: string | null;
          participantes: number | null;
          pretenciones_cliente: string | null;
          sesiones: number | null;
        };
        Insert: {
          audiovisuales?: boolean | null;
          espacio?: boolean;
          fecha_aprobacion?: string | null;
          fecha_ejecucion_servicio?: string | null;
          fecha_solicitud?: string | null;
          horas_totales?: number | null;
          id?: number;
          id_direccion_ejecucion_solped?: number | null;
          id_direccion_envio_solped?: number | null;
          id_estatus?: number | null;
          id_modalidad?: number | null;
          id_servicio?: number | null;
          id_trato?: number | null;
          motivo_rechazo?: string | null;
          nro_ecc?: number | null;
          nro_solped?: number | null;
          observaciones_cliente?: string | null;
          participantes?: number | null;
          pretenciones_cliente?: string | null;
          sesiones?: number | null;
        };
        Update: {
          audiovisuales?: boolean | null;
          espacio?: boolean;
          fecha_aprobacion?: string | null;
          fecha_ejecucion_servicio?: string | null;
          fecha_solicitud?: string | null;
          horas_totales?: number | null;
          id?: number;
          id_direccion_ejecucion_solped?: number | null;
          id_direccion_envio_solped?: number | null;
          id_estatus?: number | null;
          id_modalidad?: number | null;
          id_servicio?: number | null;
          id_trato?: number | null;
          motivo_rechazo?: string | null;
          nro_ecc?: number | null;
          nro_solped?: number | null;
          observaciones_cliente?: string | null;
          participantes?: number | null;
          pretenciones_cliente?: string | null;
          sesiones?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "ecc_encabezado_id_direccion_ejecucion_solped_fkey";
            columns: ["id_direccion_ejecucion_solped"];
            isOneToOne: false;
            referencedRelation: "direcciones_cliente";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ecc_encabezado_id_direccion_envio_solped_fkey";
            columns: ["id_direccion_envio_solped"];
            isOneToOne: false;
            referencedRelation: "direcciones_cliente";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ecc_encabezado_id_estatus_fkey";
            columns: ["id_estatus"];
            isOneToOne: false;
            referencedRelation: "conf_estatus";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ecc_encabezado_id_modalidad_fkey";
            columns: ["id_modalidad"];
            isOneToOne: false;
            referencedRelation: "modalidades";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ecc_encabezado_id_servicio_fkey";
            columns: ["id_servicio"];
            isOneToOne: false;
            referencedRelation: "catalogo_servicios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ecc_encabezado_id_servicio_fkey";
            columns: ["id_servicio"];
            isOneToOne: false;
            referencedRelation: "v_osi_formato_completo";
            referencedColumns: ["id_servicio"];
          },
          {
            foreignKeyName: "ecc_encabezado_id_trato_fkey";
            columns: ["id_trato"];
            isOneToOne: false;
            referencedRelation: "tratos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ecc_encabezado_id_trato_fkey";
            columns: ["id_trato"];
            isOneToOne: false;
            referencedRelation: "v_ecc_preview_context";
            referencedColumns: ["trato_table_id"];
          },
          {
            foreignKeyName: "ecc_encabezado_id_trato_fkey";
            columns: ["id_trato"];
            isOneToOne: false;
            referencedRelation: "v_funnel_comercial_detallado";
            referencedColumns: ["trato_id"];
          },
        ];
      };
      ecc_totales: {
        Row: {
          admin_costo_hora_aplicado: number | null;
          admin_factor_aplicado: number | null;
          admin_horas_aplicadas: number | null;
          admin_meta_global_aplicada: number | null;
          id: number;
          id_ecc: number;
          monto_gastos_admin: number | null;
          monto_iva: number | null;
          monto_utilidad: number | null;
          precio_por_persona: number | null;
          subtotal_costos_directos: number | null;
          total_general: number | null;
        };
        Insert: {
          admin_costo_hora_aplicado?: number | null;
          admin_factor_aplicado?: number | null;
          admin_horas_aplicadas?: number | null;
          admin_meta_global_aplicada?: number | null;
          id?: number;
          id_ecc: number;
          monto_gastos_admin?: number | null;
          monto_iva?: number | null;
          monto_utilidad?: number | null;
          precio_por_persona?: number | null;
          subtotal_costos_directos?: number | null;
          total_general?: number | null;
        };
        Update: {
          admin_costo_hora_aplicado?: number | null;
          admin_factor_aplicado?: number | null;
          admin_horas_aplicadas?: number | null;
          admin_meta_global_aplicada?: number | null;
          id?: number;
          id_ecc?: number;
          monto_gastos_admin?: number | null;
          monto_iva?: number | null;
          monto_utilidad?: number | null;
          precio_por_persona?: number | null;
          subtotal_costos_directos?: number | null;
          total_general?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "ecc_totales_id_ecc_fkey";
            columns: ["id_ecc"];
            isOneToOne: true;
            referencedRelation: "ecc_encabezado";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ecc_totales_id_ecc_fkey";
            columns: ["id_ecc"];
            isOneToOne: true;
            referencedRelation: "v_ecc_preview_context";
            referencedColumns: ["ecc_id"];
          },
          {
            foreignKeyName: "ecc_totales_id_ecc_fkey";
            columns: ["id_ecc"];
            isOneToOne: true;
            referencedRelation: "v_ecc_resumen";
            referencedColumns: ["id_ecc"];
          },
          {
            foreignKeyName: "ecc_totales_id_ecc_fkey";
            columns: ["id_ecc"];
            isOneToOne: true;
            referencedRelation: "v_funnel_comercial_detallado";
            referencedColumns: ["ecc_id"];
          },
        ];
      };
      ejecucion_osi: {
        Row: {
          audiovisuales: boolean;
          carnet_impreso: boolean;
          certificado_impreso: boolean;
          created_at: string | null;
          fecha_emision: string | null;
          fecha_fin_real: string | null;
          fecha_firma_administracion: string | null;
          fecha_firma_calidad: string | null;
          fecha_firma_direccion: string | null;
          fecha_firma_negocios: string | null;
          fecha_firma_verificacion: string | null;
          fecha_inicio_real: string | null;
          hora_inicio_servicio: string | null;
          horas_academicas_ejecucion: number | null;
          id: number;
          id_direccion_ejecucion_real: number | null;
          id_direccion_envio_real: number | null;
          id_ecc: number;
          id_ecc_origen: number | null;
          id_estatus: number | null;
          id_presupuesto: number | null;
          id_responsable_recepcion: number | null;
          impacto_ecc_delta: number | null;
          impacto_ecc_en: string | null;
          impacto_ecc_pendiente: boolean;
          impacto_ecc_resuelto_por: string | null;
          nro_osi_secuencial: string;
          observaciones_adicionales_osi: string | null;
          participantes_ejecucion: number | null;
          pretenciones_adicionales_osi: string | null;
          sesiones_ejecucion: number | null;
          sesiones_programadas: Json;
          updated_at: string | null;
        };
        Insert: {
          audiovisuales?: boolean;
          carnet_impreso?: boolean;
          certificado_impreso?: boolean;
          created_at?: string | null;
          fecha_emision?: string | null;
          fecha_fin_real?: string | null;
          fecha_firma_administracion?: string | null;
          fecha_firma_calidad?: string | null;
          fecha_firma_direccion?: string | null;
          fecha_firma_negocios?: string | null;
          fecha_firma_verificacion?: string | null;
          fecha_inicio_real?: string | null;
          hora_inicio_servicio?: string | null;
          horas_academicas_ejecucion?: number | null;
          id?: number;
          id_direccion_ejecucion_real?: number | null;
          id_direccion_envio_real?: number | null;
          id_ecc: number;
          id_ecc_origen?: number | null;
          id_estatus?: number | null;
          id_presupuesto?: number | null;
          id_responsable_recepcion?: number | null;
          impacto_ecc_delta?: number | null;
          impacto_ecc_en?: string | null;
          impacto_ecc_pendiente?: boolean;
          impacto_ecc_resuelto_por?: string | null;
          nro_osi_secuencial: string;
          observaciones_adicionales_osi?: string | null;
          participantes_ejecucion?: number | null;
          pretenciones_adicionales_osi?: string | null;
          sesiones_ejecucion?: number | null;
          sesiones_programadas?: Json;
          updated_at?: string | null;
        };
        Update: {
          audiovisuales?: boolean;
          carnet_impreso?: boolean;
          certificado_impreso?: boolean;
          created_at?: string | null;
          fecha_emision?: string | null;
          fecha_fin_real?: string | null;
          fecha_firma_administracion?: string | null;
          fecha_firma_calidad?: string | null;
          fecha_firma_direccion?: string | null;
          fecha_firma_negocios?: string | null;
          fecha_firma_verificacion?: string | null;
          fecha_inicio_real?: string | null;
          hora_inicio_servicio?: string | null;
          horas_academicas_ejecucion?: number | null;
          id?: number;
          id_direccion_ejecucion_real?: number | null;
          id_direccion_envio_real?: number | null;
          id_ecc?: number;
          id_ecc_origen?: number | null;
          id_estatus?: number | null;
          id_presupuesto?: number | null;
          id_responsable_recepcion?: number | null;
          impacto_ecc_delta?: number | null;
          impacto_ecc_en?: string | null;
          impacto_ecc_pendiente?: boolean;
          impacto_ecc_resuelto_por?: string | null;
          nro_osi_secuencial?: string;
          observaciones_adicionales_osi?: string | null;
          participantes_ejecucion?: number | null;
          pretenciones_adicionales_osi?: string | null;
          sesiones_ejecucion?: number | null;
          sesiones_programadas?: Json;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ejecucion_osi_id_direccion_ejecucion_real_fkey";
            columns: ["id_direccion_ejecucion_real"];
            isOneToOne: false;
            referencedRelation: "direcciones_cliente";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ejecucion_osi_id_direccion_envio_real_fkey";
            columns: ["id_direccion_envio_real"];
            isOneToOne: false;
            referencedRelation: "direcciones_cliente";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ejecucion_osi_id_ecc_fkey";
            columns: ["id_ecc"];
            isOneToOne: false;
            referencedRelation: "ecc_encabezado";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ejecucion_osi_id_ecc_fkey";
            columns: ["id_ecc"];
            isOneToOne: false;
            referencedRelation: "v_ecc_preview_context";
            referencedColumns: ["ecc_id"];
          },
          {
            foreignKeyName: "ejecucion_osi_id_ecc_fkey";
            columns: ["id_ecc"];
            isOneToOne: false;
            referencedRelation: "v_ecc_resumen";
            referencedColumns: ["id_ecc"];
          },
          {
            foreignKeyName: "ejecucion_osi_id_ecc_fkey";
            columns: ["id_ecc"];
            isOneToOne: false;
            referencedRelation: "v_funnel_comercial_detallado";
            referencedColumns: ["ecc_id"];
          },
          {
            foreignKeyName: "ejecucion_osi_id_estatus_fkey";
            columns: ["id_estatus"];
            isOneToOne: false;
            referencedRelation: "conf_estatus";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ejecucion_osi_id_presupuesto_fkey";
            columns: ["id_presupuesto"];
            isOneToOne: false;
            referencedRelation: "presupuestos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ejecucion_osi_id_responsable_recepcion_fkey";
            columns: ["id_responsable_recepcion"];
            isOneToOne: false;
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          },
        ];
      };
      empresas: {
        Row: {
          codigo_cliente: number;
          direccion_fiscal: string | null;
          es_cliente: boolean;
          esta_activo: boolean | null;
          fecha_creacion: string | null;
          id: number;
          id_ejecutivo_owner: number | null;
          id_estado_ubicacion: number | null;
          observaciones: string | null;
          que_hace_la_empresa: string | null;
          razon_social: string;
          rif: string;
          sector_industrial: string | null;
        };
        Insert: {
          codigo_cliente?: number;
          direccion_fiscal?: string | null;
          es_cliente?: boolean;
          esta_activo?: boolean | null;
          fecha_creacion?: string | null;
          id?: number;
          id_ejecutivo_owner?: number | null;
          id_estado_ubicacion?: number | null;
          observaciones?: string | null;
          que_hace_la_empresa?: string | null;
          razon_social: string;
          rif: string;
          sector_industrial?: string | null;
        };
        Update: {
          codigo_cliente?: number;
          direccion_fiscal?: string | null;
          es_cliente?: boolean;
          esta_activo?: boolean | null;
          fecha_creacion?: string | null;
          id?: number;
          id_ejecutivo_owner?: number | null;
          id_estado_ubicacion?: number | null;
          observaciones?: string | null;
          que_hace_la_empresa?: string | null;
          razon_social?: string;
          rif?: string;
          sector_industrial?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "empresas_id_ejecutivo_owner_fkey";
            columns: ["id_ejecutivo_owner"];
            isOneToOne: false;
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "empresas_id_estado_ubicacion_fkey";
            columns: ["id_estado_ubicacion"];
            isOneToOne: false;
            referencedRelation: "cat_estados_venezuela";
            referencedColumns: ["id"];
          },
        ];
      };
      equipos: {
        Row: {
          codigo_inventario: string;
          condiciones_equipo_info: string | null;
          esta_activo: boolean | null;
          estado_accesorios: string | null;
          id: number;
          id_estatus: number | null;
          id_proveedor_fabricante: number | null;
          item_nombre: string;
          modelo: string | null;
          observaciones_generales: string | null;
          serial_fabricante: string | null;
          tipo_pila: string | null;
          ubicacion_fisica: string | null;
        };
        Insert: {
          codigo_inventario: string;
          condiciones_equipo_info?: string | null;
          esta_activo?: boolean | null;
          estado_accesorios?: string | null;
          id?: number;
          id_estatus?: number | null;
          id_proveedor_fabricante?: number | null;
          item_nombre: string;
          modelo?: string | null;
          observaciones_generales?: string | null;
          serial_fabricante?: string | null;
          tipo_pila?: string | null;
          ubicacion_fisica?: string | null;
        };
        Update: {
          codigo_inventario?: string;
          condiciones_equipo_info?: string | null;
          esta_activo?: boolean | null;
          estado_accesorios?: string | null;
          id?: number;
          id_estatus?: number | null;
          id_proveedor_fabricante?: number | null;
          item_nombre?: string;
          modelo?: string | null;
          observaciones_generales?: string | null;
          serial_fabricante?: string | null;
          tipo_pila?: string | null;
          ubicacion_fisica?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "equipos_id_estatus_fkey";
            columns: ["id_estatus"];
            isOneToOne: false;
            referencedRelation: "conf_estatus";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "equipos_id_proveedor_fabricante_fkey";
            columns: ["id_proveedor_fabricante"];
            isOneToOne: false;
            referencedRelation: "proveedores";
            referencedColumns: ["id"];
          },
        ];
      };
      evaluaciones_rendimiento: {
        Row: {
          fecha_evaluacion: string | null;
          frecuencia_evaluacion: string | null;
          id: number;
          id_empleado_supervisor: number | null;
          id_estatus_evaluacion: number | null;
          id_facilitador: number | null;
          id_proveedor: number | null;
          proxima_evaluacion: string | null;
          resultado_evaluacion: number | null;
        };
        Insert: {
          fecha_evaluacion?: string | null;
          frecuencia_evaluacion?: string | null;
          id?: number;
          id_empleado_supervisor?: number | null;
          id_estatus_evaluacion?: number | null;
          id_facilitador?: number | null;
          id_proveedor?: number | null;
          proxima_evaluacion?: string | null;
          resultado_evaluacion?: number | null;
        };
        Update: {
          fecha_evaluacion?: string | null;
          frecuencia_evaluacion?: string | null;
          id?: number;
          id_empleado_supervisor?: number | null;
          id_estatus_evaluacion?: number | null;
          id_facilitador?: number | null;
          id_proveedor?: number | null;
          proxima_evaluacion?: string | null;
          resultado_evaluacion?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "evaluaciones_rendimiento_id_empleado_supervisor_fkey";
            columns: ["id_empleado_supervisor"];
            isOneToOne: false;
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "evaluaciones_rendimiento_id_estatus_evaluacion_fkey";
            columns: ["id_estatus_evaluacion"];
            isOneToOne: false;
            referencedRelation: "conf_estatus";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "evaluaciones_rendimiento_id_facilitador_fkey";
            columns: ["id_facilitador"];
            isOneToOne: false;
            referencedRelation: "facilitadores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "evaluaciones_rendimiento_id_proveedor_fkey";
            columns: ["id_proveedor"];
            isOneToOne: false;
            referencedRelation: "proveedores";
            referencedColumns: ["id"];
          },
        ];
      };
      facilitadores: {
        Row: {
          alcance: string | null;
          ano_ingreso: number | null;
          calificacion: number | null;
          cedula: string | null;
          direccion: string | null;
          email: string | null;
          fecha_actualizacion: string | null;
          fecha_creacion: string | null;
          fecha_ingreso: string | null;
          firma_id: number | null;
          formacion_docente_certificada: boolean | null;
          fuente: string | null;
          id: number;
          id_ciudad: number | null;
          id_estado_geografico: number | null;
          is_active: boolean;
          nivel_educacion: string | null;
          nombre_apellido: string;
          notas_observaciones: string | null;
          rif: string | null;
          telefono: string | null;
          temas_cursos: string[];
          tiene_certificaciones: boolean | null;
          tiene_curriculum: boolean | null;
          tiene_foto_perfil: boolean | null;
        };
        Insert: {
          alcance?: string | null;
          ano_ingreso?: number | null;
          calificacion?: number | null;
          cedula?: string | null;
          direccion?: string | null;
          email?: string | null;
          fecha_actualizacion?: string | null;
          fecha_creacion?: string | null;
          fecha_ingreso?: string | null;
          firma_id?: number | null;
          formacion_docente_certificada?: boolean | null;
          fuente?: string | null;
          id?: number;
          id_ciudad?: number | null;
          id_estado_geografico?: number | null;
          is_active?: boolean;
          nivel_educacion?: string | null;
          nombre_apellido: string;
          notas_observaciones?: string | null;
          rif?: string | null;
          telefono?: string | null;
          temas_cursos?: string[];
          tiene_certificaciones?: boolean | null;
          tiene_curriculum?: boolean | null;
          tiene_foto_perfil?: boolean | null;
        };
        Update: {
          alcance?: string | null;
          ano_ingreso?: number | null;
          calificacion?: number | null;
          cedula?: string | null;
          direccion?: string | null;
          email?: string | null;
          fecha_actualizacion?: string | null;
          fecha_creacion?: string | null;
          fecha_ingreso?: string | null;
          firma_id?: number | null;
          formacion_docente_certificada?: boolean | null;
          fuente?: string | null;
          id?: number;
          id_ciudad?: number | null;
          id_estado_geografico?: number | null;
          is_active?: boolean;
          nivel_educacion?: string | null;
          nombre_apellido?: string;
          notas_observaciones?: string | null;
          rif?: string | null;
          telefono?: string | null;
          temas_cursos?: string[];
          tiene_certificaciones?: boolean | null;
          tiene_curriculum?: boolean | null;
          tiene_foto_perfil?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: "facilitadores_firma_id_fkey";
            columns: ["firma_id"];
            isOneToOne: false;
            referencedRelation: "firmas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "facilitadores_id_ciudad_fkey";
            columns: ["id_ciudad"];
            isOneToOne: false;
            referencedRelation: "cat_ciudades";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "facilitadores_id_estado_geografico_fkey";
            columns: ["id_estado_geografico"];
            isOneToOne: false;
            referencedRelation: "cat_estados_venezuela";
            referencedColumns: ["id"];
          },
        ];
      };
      fin_egresos_pagos: {
        Row: {
          comprobante_url: string | null;
          fecha_pago_real: string | null;
          fecha_programada: string | null;
          id: number;
          id_cuenta_origen: number | null;
          id_estatus: number | null;
          id_facilitador: number | null;
          id_osi: number | null;
          id_proveedor: number | null;
          monto_bruto: number;
          monto_neto_pagado: number | null;
          referencia_egreso: string | null;
        };
        Insert: {
          comprobante_url?: string | null;
          fecha_pago_real?: string | null;
          fecha_programada?: string | null;
          id?: number;
          id_cuenta_origen?: number | null;
          id_estatus?: number | null;
          id_facilitador?: number | null;
          id_osi?: number | null;
          id_proveedor?: number | null;
          monto_bruto: number;
          monto_neto_pagado?: number | null;
          referencia_egreso?: string | null;
        };
        Update: {
          comprobante_url?: string | null;
          fecha_pago_real?: string | null;
          fecha_programada?: string | null;
          id?: number;
          id_cuenta_origen?: number | null;
          id_estatus?: number | null;
          id_facilitador?: number | null;
          id_osi?: number | null;
          id_proveedor?: number | null;
          monto_bruto?: number;
          monto_neto_pagado?: number | null;
          referencia_egreso?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fin_egresos_pagos_id_cuenta_origen_fkey";
            columns: ["id_cuenta_origen"];
            isOneToOne: false;
            referencedRelation: "datos_bancarios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fin_egresos_pagos_id_estatus_fkey";
            columns: ["id_estatus"];
            isOneToOne: false;
            referencedRelation: "conf_estatus";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fin_egresos_pagos_id_facilitador_fkey";
            columns: ["id_facilitador"];
            isOneToOne: false;
            referencedRelation: "facilitadores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fin_egresos_pagos_id_osi_fkey";
            columns: ["id_osi"];
            isOneToOne: false;
            referencedRelation: "ejecucion_osi";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fin_egresos_pagos_id_osi_fkey";
            columns: ["id_osi"];
            isOneToOne: false;
            referencedRelation: "v_osi_formato_completo";
            referencedColumns: ["id_osi"];
          },
          {
            foreignKeyName: "fin_egresos_pagos_id_proveedor_fkey";
            columns: ["id_proveedor"];
            isOneToOne: false;
            referencedRelation: "proveedores";
            referencedColumns: ["id"];
          },
        ];
      };
      fin_ingresos_clientes: {
        Row: {
          fecha_pago: string | null;
          id: number;
          id_cuenta_destino: number | null;
          id_estatus: number | null;
          id_presupuesto: number | null;
          monto: number;
          observaciones: string | null;
          referencia: string | null;
        };
        Insert: {
          fecha_pago?: string | null;
          id?: number;
          id_cuenta_destino?: number | null;
          id_estatus?: number | null;
          id_presupuesto?: number | null;
          monto: number;
          observaciones?: string | null;
          referencia?: string | null;
        };
        Update: {
          fecha_pago?: string | null;
          id?: number;
          id_cuenta_destino?: number | null;
          id_estatus?: number | null;
          id_presupuesto?: number | null;
          monto?: number;
          observaciones?: string | null;
          referencia?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fin_ingresos_clientes_id_cuenta_destino_fkey";
            columns: ["id_cuenta_destino"];
            isOneToOne: false;
            referencedRelation: "datos_bancarios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fin_ingresos_clientes_id_estatus_fkey";
            columns: ["id_estatus"];
            isOneToOne: false;
            referencedRelation: "conf_estatus";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fin_ingresos_clientes_id_presupuesto_fkey";
            columns: ["id_presupuesto"];
            isOneToOne: false;
            referencedRelation: "presupuestos";
            referencedColumns: ["id"];
          },
        ];
      };
      firmas: {
        Row: {
          fecha_actualizacion: string | null;
          fecha_creacion: string | null;
          id: number;
          is_active: boolean | null;
          nombre: string;
          tipo: Database["public"]["Enums"]["firma_tipo"];
          url_imagen: string;
        };
        Insert: {
          fecha_actualizacion?: string | null;
          fecha_creacion?: string | null;
          id?: number;
          is_active?: boolean | null;
          nombre: string;
          tipo: Database["public"]["Enums"]["firma_tipo"];
          url_imagen: string;
        };
        Update: {
          fecha_actualizacion?: string | null;
          fecha_creacion?: string | null;
          id?: number;
          is_active?: boolean | null;
          nombre?: string;
          tipo?: Database["public"]["Enums"]["firma_tipo"];
          url_imagen?: string;
        };
        Relationships: [];
      };
      historial_calibracion: {
        Row: {
          certificado_nro: string | null;
          fecha_calibracion: string;
          fecha_vencimiento: string;
          frecuencia_meses: number | null;
          id: number;
          id_equipo: number | null;
          observaciones: string | null;
        };
        Insert: {
          certificado_nro?: string | null;
          fecha_calibracion: string;
          fecha_vencimiento: string;
          frecuencia_meses?: number | null;
          id?: number;
          id_equipo?: number | null;
          observaciones?: string | null;
        };
        Update: {
          certificado_nro?: string | null;
          fecha_calibracion?: string;
          fecha_vencimiento?: string;
          frecuencia_meses?: number | null;
          id?: number;
          id_equipo?: number | null;
          observaciones?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "historial_calibracion_id_equipo_fkey";
            columns: ["id_equipo"];
            isOneToOne: false;
            referencedRelation: "equipos";
            referencedColumns: ["id"];
          },
        ];
      };
      historial_cambios_estado: {
        Row: {
          fecha_cambio: string | null;
          id: number;
          id_estatus_anterior: number | null;
          id_estatus_nuevo: number | null;
          id_registro: number | null;
          id_usuario_cambio: number | null;
          tabla_afectada: string | null;
        };
        Insert: {
          fecha_cambio?: string | null;
          id?: number;
          id_estatus_anterior?: number | null;
          id_estatus_nuevo?: number | null;
          id_registro?: number | null;
          id_usuario_cambio?: number | null;
          tabla_afectada?: string | null;
        };
        Update: {
          fecha_cambio?: string | null;
          id?: number;
          id_estatus_anterior?: number | null;
          id_estatus_nuevo?: number | null;
          id_registro?: number | null;
          id_usuario_cambio?: number | null;
          tabla_afectada?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "historial_cambios_estado_id_estado_anterior_fkey";
            columns: ["id_estatus_anterior"];
            isOneToOne: false;
            referencedRelation: "conf_estatus";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "historial_cambios_estado_id_estado_nuevo_fkey";
            columns: ["id_estatus_nuevo"];
            isOneToOne: false;
            referencedRelation: "conf_estatus";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "historial_cambios_estado_id_usuario_cambio_fkey";
            columns: ["id_usuario_cambio"];
            isOneToOne: false;
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          },
        ];
      };
      inventario: {
        Row: {
          clave_windows: string | null;
          correo_corporativo: string | null;
          correo_personal: string | null;
          creado_en: string | null;
          departamento: string | null;
          espacio_ssd_hdd: string | null;
          id: string;
          id_departamento: number | null;
          id_producto: string | null;
          nombre_dispositivo: string | null;
          nombre_usuario: string | null;
          numero_extension: string | null;
          procesador: string | null;
          ram_instalada: string | null;
          tarjeta_grafica: string | null;
          telefono_corporativo: string | null;
          telefono_personal: string | null;
          usuario_windows: string | null;
          velocidad_tarjeta_red: string | null;
          version_windows: string | null;
        };
        Insert: {
          clave_windows?: string | null;
          correo_corporativo?: string | null;
          correo_personal?: string | null;
          creado_en?: string | null;
          departamento?: string | null;
          espacio_ssd_hdd?: string | null;
          id?: string;
          id_departamento?: number | null;
          id_producto?: string | null;
          nombre_dispositivo?: string | null;
          nombre_usuario?: string | null;
          numero_extension?: string | null;
          procesador?: string | null;
          ram_instalada?: string | null;
          tarjeta_grafica?: string | null;
          telefono_corporativo?: string | null;
          telefono_personal?: string | null;
          usuario_windows?: string | null;
          velocidad_tarjeta_red?: string | null;
          version_windows?: string | null;
        };
        Update: {
          clave_windows?: string | null;
          correo_corporativo?: string | null;
          correo_personal?: string | null;
          creado_en?: string | null;
          departamento?: string | null;
          espacio_ssd_hdd?: string | null;
          id?: string;
          id_departamento?: number | null;
          id_producto?: string | null;
          nombre_dispositivo?: string | null;
          nombre_usuario?: string | null;
          numero_extension?: string | null;
          procesador?: string | null;
          ram_instalada?: string | null;
          tarjeta_grafica?: string | null;
          telefono_corporativo?: string | null;
          telefono_personal?: string | null;
          usuario_windows?: string | null;
          velocidad_tarjeta_red?: string | null;
          version_windows?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "inventario_id_departamento_fkey";
            columns: ["id_departamento"];
            isOneToOne: false;
            referencedRelation: "departamentos";
            referencedColumns: ["id"];
          },
        ];
      };
      marketing_leads: {
        Row: {
          fecha_ingreso: string | null;
          id: number;
          id_contacto: number | null;
          id_departamento_recibe: number | null;
          id_ejecutivo_owner: number | null;
          id_ejecutivo_recibe: number | null;
          id_estatus: number | null;
          id_origen: number | null;
          id_servicio_interes: number | null;
          is_duplicate: boolean | null;
          notas_adicionales: string | null;
          raw_email: string | null;
          raw_empresa: string | null;
          raw_nombre_apellido: string | null;
          raw_telefono: string | null;
          telefono_ejecutivo: string | null;
        };
        Insert: {
          fecha_ingreso?: string | null;
          id?: number;
          id_contacto?: number | null;
          id_departamento_recibe?: number | null;
          id_ejecutivo_owner?: number | null;
          id_ejecutivo_recibe?: number | null;
          id_estatus?: number | null;
          id_origen?: number | null;
          id_servicio_interes?: number | null;
          is_duplicate?: boolean | null;
          notas_adicionales?: string | null;
          raw_email?: string | null;
          raw_empresa?: string | null;
          raw_nombre_apellido?: string | null;
          raw_telefono?: string | null;
          telefono_ejecutivo?: string | null;
        };
        Update: {
          fecha_ingreso?: string | null;
          id?: number;
          id_contacto?: number | null;
          id_departamento_recibe?: number | null;
          id_ejecutivo_owner?: number | null;
          id_ejecutivo_recibe?: number | null;
          id_estatus?: number | null;
          id_origen?: number | null;
          id_servicio_interes?: number | null;
          is_duplicate?: boolean | null;
          notas_adicionales?: string | null;
          raw_email?: string | null;
          raw_empresa?: string | null;
          raw_nombre_apellido?: string | null;
          raw_telefono?: string | null;
          telefono_ejecutivo?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "marketing_leads_id_contacto_fkey1";
            columns: ["id_contacto"];
            isOneToOne: false;
            referencedRelation: "contactos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "marketing_leads_id_departamento_recibe_fkey1";
            columns: ["id_departamento_recibe"];
            isOneToOne: false;
            referencedRelation: "departamentos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "marketing_leads_id_ejecutivo_owner_fkey1";
            columns: ["id_ejecutivo_owner"];
            isOneToOne: false;
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "marketing_leads_id_ejecutivo_recibe_fkey1";
            columns: ["id_ejecutivo_recibe"];
            isOneToOne: false;
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "marketing_leads_id_estatus_fkey1";
            columns: ["id_estatus"];
            isOneToOne: false;
            referencedRelation: "conf_estatus";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "marketing_leads_id_origen_fkey1";
            columns: ["id_origen"];
            isOneToOne: false;
            referencedRelation: "cat_origenes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "marketing_leads_id_servicio_interes_fkey1";
            columns: ["id_servicio_interes"];
            isOneToOne: false;
            referencedRelation: "catalogo_servicios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "marketing_leads_id_servicio_interes_fkey1";
            columns: ["id_servicio_interes"];
            isOneToOne: false;
            referencedRelation: "v_osi_formato_completo";
            referencedColumns: ["id_servicio"];
          },
        ];
      };
      marketing_leads_test_abril: {
        Row: {
          fecha_ingreso: string | null;
          id: number;
          id_contacto: number | null;
          id_departamento_recibe: number | null;
          id_ejecutivo_owner: number | null;
          id_ejecutivo_recibe: number | null;
          id_estatus: number | null;
          id_origen: number | null;
          id_servicio_interes: number | null;
          is_duplicate: boolean | null;
          notas_adicionales: string | null;
          raw_email: string | null;
          raw_empresa: string | null;
          raw_nombre_apellido: string | null;
          raw_telefono: string | null;
          telefono_ejecutivo: string | null;
        };
        Insert: {
          fecha_ingreso?: string | null;
          id?: number;
          id_contacto?: number | null;
          id_departamento_recibe?: number | null;
          id_ejecutivo_owner?: number | null;
          id_ejecutivo_recibe?: number | null;
          id_estatus?: number | null;
          id_origen?: number | null;
          id_servicio_interes?: number | null;
          is_duplicate?: boolean | null;
          notas_adicionales?: string | null;
          raw_email?: string | null;
          raw_empresa?: string | null;
          raw_nombre_apellido?: string | null;
          raw_telefono?: string | null;
          telefono_ejecutivo?: string | null;
        };
        Update: {
          fecha_ingreso?: string | null;
          id?: number;
          id_contacto?: number | null;
          id_departamento_recibe?: number | null;
          id_ejecutivo_owner?: number | null;
          id_ejecutivo_recibe?: number | null;
          id_estatus?: number | null;
          id_origen?: number | null;
          id_servicio_interes?: number | null;
          is_duplicate?: boolean | null;
          notas_adicionales?: string | null;
          raw_email?: string | null;
          raw_empresa?: string | null;
          raw_nombre_apellido?: string | null;
          raw_telefono?: string | null;
          telefono_ejecutivo?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "marketing_leads_id_contacto_fkey";
            columns: ["id_contacto"];
            isOneToOne: false;
            referencedRelation: "contactos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "marketing_leads_id_departamento_recibe_fkey";
            columns: ["id_departamento_recibe"];
            isOneToOne: false;
            referencedRelation: "departamentos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "marketing_leads_id_ejecutivo_owner_fkey";
            columns: ["id_ejecutivo_owner"];
            isOneToOne: false;
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "marketing_leads_id_ejecutivo_recibe_fkey";
            columns: ["id_ejecutivo_recibe"];
            isOneToOne: false;
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "marketing_leads_id_estatus_fkey";
            columns: ["id_estatus"];
            isOneToOne: false;
            referencedRelation: "conf_estatus";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "marketing_leads_id_origen_fkey";
            columns: ["id_origen"];
            isOneToOne: false;
            referencedRelation: "cat_origenes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "marketing_leads_id_servicio_interes_fkey";
            columns: ["id_servicio_interes"];
            isOneToOne: false;
            referencedRelation: "catalogo_servicios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "marketing_leads_id_servicio_interes_fkey";
            columns: ["id_servicio_interes"];
            isOneToOne: false;
            referencedRelation: "v_osi_formato_completo";
            referencedColumns: ["id_servicio"];
          },
        ];
      };
      modalidades: {
        Row: {
          id: number;
          nombre: string;
        };
        Insert: {
          id?: number;
          nombre: string;
        };
        Update: {
          id?: number;
          nombre?: string;
        };
        Relationships: [];
      };
      osi_recursos_estimados: {
        Row: {
          costo_bateria: number | null;
          costo_carnetizacion: number | null;
          costo_dias_especialista: number | null;
          costo_honorarios_instructor: number | null;
          costo_hospedaje: number | null;
          costo_impresion_material: number | null;
          costo_logistica_comida: number | null;
          costo_otros: number | null;
          costo_pop: number | null;
          costo_traslado: number | null;
          created_at: string | null;
          dias_hospedaje_facilitador: number | null;
          dias_logistica_facilitador: number | null;
          horas_honorarios_instructor: number | null;
          id: number;
          id_osi: number;
          pop_incluido: boolean | null;
          public_cost_mask: Json;
          tarifa_hora_honorarios: number | null;
          traslado_externo: number | null;
        };
        Insert: {
          costo_bateria?: number | null;
          costo_carnetizacion?: number | null;
          costo_dias_especialista?: number | null;
          costo_honorarios_instructor?: number | null;
          costo_hospedaje?: number | null;
          costo_impresion_material?: number | null;
          costo_logistica_comida?: number | null;
          costo_otros?: number | null;
          costo_pop?: number | null;
          costo_traslado?: number | null;
          created_at?: string | null;
          dias_hospedaje_facilitador?: number | null;
          dias_logistica_facilitador?: number | null;
          horas_honorarios_instructor?: number | null;
          id?: number;
          id_osi: number;
          pop_incluido?: boolean | null;
          public_cost_mask?: Json;
          tarifa_hora_honorarios?: number | null;
          traslado_externo?: number | null;
        };
        Update: {
          costo_bateria?: number | null;
          costo_carnetizacion?: number | null;
          costo_dias_especialista?: number | null;
          costo_honorarios_instructor?: number | null;
          costo_hospedaje?: number | null;
          costo_impresion_material?: number | null;
          costo_logistica_comida?: number | null;
          costo_otros?: number | null;
          costo_pop?: number | null;
          costo_traslado?: number | null;
          created_at?: string | null;
          dias_hospedaje_facilitador?: number | null;
          dias_logistica_facilitador?: number | null;
          horas_honorarios_instructor?: number | null;
          id?: number;
          id_osi?: number;
          pop_incluido?: boolean | null;
          public_cost_mask?: Json;
          tarifa_hora_honorarios?: number | null;
          traslado_externo?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "osi_recursos_estimados_id_osi_fkey";
            columns: ["id_osi"];
            isOneToOne: false;
            referencedRelation: "ejecucion_osi";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "osi_recursos_estimados_id_osi_fkey";
            columns: ["id_osi"];
            isOneToOne: false;
            referencedRelation: "v_osi_formato_completo";
            referencedColumns: ["id_osi"];
          },
        ];
      };
      osi_sesion: {
        Row: {
          created_at: string;
          fecha: string;
          hora_fin: string | null;
          hora_inicio: string | null;
          id: number;
          id_osi: number;
          nro_sesion: number;
        };
        Insert: {
          created_at?: string;
          fecha: string;
          hora_fin?: string | null;
          hora_inicio?: string | null;
          id?: number;
          id_osi: number;
          nro_sesion: number;
        };
        Update: {
          created_at?: string;
          fecha?: string;
          hora_fin?: string | null;
          hora_inicio?: string | null;
          id?: number;
          id_osi?: number;
          nro_sesion?: number;
        };
        Relationships: [
          {
            foreignKeyName: "osi_sesion_id_osi_fkey";
            columns: ["id_osi"];
            isOneToOne: false;
            referencedRelation: "ejecucion_osi";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "osi_sesion_id_osi_fkey";
            columns: ["id_osi"];
            isOneToOne: false;
            referencedRelation: "v_osi_formato_completo";
            referencedColumns: ["id_osi"];
          },
        ];
      };
      participantes_certificados: {
        Row: {
          cedula: string | null;
          created_at: string | null;
          empresa_actual: string | null;
          id: number;
          is_active: boolean | null;
          nacionalidad: string | null;
          nombre: string | null;
        };
        Insert: {
          cedula?: string | null;
          created_at?: string | null;
          empresa_actual?: string | null;
          id?: number;
          is_active?: boolean | null;
          nacionalidad?: string | null;
          nombre?: string | null;
        };
        Update: {
          cedula?: string | null;
          created_at?: string | null;
          empresa_actual?: string | null;
          id?: number;
          is_active?: boolean | null;
          nacionalidad?: string | null;
          nombre?: string | null;
        };
        Relationships: [];
      };
      plantillas_carnets: {
        Row: {
          archivo: string;
          created_at: string | null;
          id: number;
          is_active: boolean | null;
          nombre: string;
          tipo: string | null;
          updated_at: string | null;
          url_imagen: string | null;
        };
        Insert: {
          archivo: string;
          created_at?: string | null;
          id?: number;
          is_active?: boolean | null;
          nombre: string;
          tipo?: string | null;
          updated_at?: string | null;
          url_imagen?: string | null;
        };
        Update: {
          archivo?: string;
          created_at?: string | null;
          id?: number;
          is_active?: boolean | null;
          nombre?: string;
          tipo?: string | null;
          updated_at?: string | null;
          url_imagen?: string | null;
        };
        Relationships: [];
      };
      plantillas_certificados: {
        Row: {
          archivo: string | null;
          created_at: string | null;
          id: number;
          is_active: boolean;
          nombre: string;
          updated_at: string | null;
          url_imagen: string | null;
        };
        Insert: {
          archivo?: string | null;
          created_at?: string | null;
          id?: number;
          is_active?: boolean;
          nombre: string;
          updated_at?: string | null;
          url_imagen?: string | null;
        };
        Update: {
          archivo?: string | null;
          created_at?: string | null;
          id?: number;
          is_active?: boolean;
          nombre?: string;
          updated_at?: string | null;
          url_imagen?: string | null;
        };
        Relationships: [];
      };
      plantillas_cursos: {
        Row: {
          contenido: string | null;
          created_at: string | null;
          descripcion: string | null;
          id: number;
          id_curso: number | null;
          id_empresa: number | null;
          is_active: boolean | null;
        };
        Insert: {
          contenido?: string | null;
          created_at?: string | null;
          descripcion?: string | null;
          id?: number;
          id_curso?: number | null;
          id_empresa?: number | null;
          is_active?: boolean | null;
        };
        Update: {
          contenido?: string | null;
          created_at?: string | null;
          descripcion?: string | null;
          id?: number;
          id_curso?: number | null;
          id_empresa?: number | null;
          is_active?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: "plantillas_cursos_id_curso_fkey";
            columns: ["id_curso"];
            isOneToOne: false;
            referencedRelation: "cursos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "plantillas_cursos_id_empresa_fkey";
            columns: ["id_empresa"];
            isOneToOne: false;
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "plantillas_cursos_id_empresa_fkey";
            columns: ["id_empresa"];
            isOneToOne: false;
            referencedRelation: "v_osi_formato_completo";
            referencedColumns: ["id_empresa"];
          },
        ];
      };
      presupuesto_detalles: {
        Row: {
          cantidad: number | null;
          codigo_servicio: string | null;
          descripcion_comercial: string | null;
          id: number;
          id_ecc: number;
          id_presupuesto: number;
          monto_iva: number | null;
          precio_unitario: number | null;
          total_item: number | null;
        };
        Insert: {
          cantidad?: number | null;
          codigo_servicio?: string | null;
          descripcion_comercial?: string | null;
          id?: number;
          id_ecc: number;
          id_presupuesto: number;
          monto_iva?: number | null;
          precio_unitario?: number | null;
          total_item?: number | null;
        };
        Update: {
          cantidad?: number | null;
          codigo_servicio?: string | null;
          descripcion_comercial?: string | null;
          id?: number;
          id_ecc?: number;
          id_presupuesto?: number;
          monto_iva?: number | null;
          precio_unitario?: number | null;
          total_item?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "fk_pres_ecc";
            columns: ["id_ecc"];
            isOneToOne: false;
            referencedRelation: "ecc_encabezado";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_pres_ecc";
            columns: ["id_ecc"];
            isOneToOne: false;
            referencedRelation: "v_ecc_preview_context";
            referencedColumns: ["ecc_id"];
          },
          {
            foreignKeyName: "fk_pres_ecc";
            columns: ["id_ecc"];
            isOneToOne: false;
            referencedRelation: "v_ecc_resumen";
            referencedColumns: ["id_ecc"];
          },
          {
            foreignKeyName: "fk_pres_ecc";
            columns: ["id_ecc"];
            isOneToOne: false;
            referencedRelation: "v_funnel_comercial_detallado";
            referencedColumns: ["ecc_id"];
          },
          {
            foreignKeyName: "fk_pres_maestro";
            columns: ["id_presupuesto"];
            isOneToOne: false;
            referencedRelation: "presupuestos";
            referencedColumns: ["id"];
          },
        ];
      };
      presupuesto_terminos: {
        Row: {
          contenido: string;
          created_at: string;
          id: number;
          id_presupuesto: number;
          orden: number;
        };
        Insert: {
          contenido: string;
          created_at?: string;
          id?: number;
          id_presupuesto: number;
          orden: number;
        };
        Update: {
          contenido?: string;
          created_at?: string;
          id?: number;
          id_presupuesto?: number;
          orden?: number;
        };
        Relationships: [
          {
            foreignKeyName: "presupuesto_terminos_id_presupuesto_fkey";
            columns: ["id_presupuesto"];
            isOneToOne: false;
            referencedRelation: "presupuestos";
            referencedColumns: ["id"];
          },
        ];
      };
      presupuestos: {
        Row: {
          fecha_emision: string | null;
          id: number;
          id_datos_bancarios: number | null;
          id_estatus: number | null;
          id_trato: number | null;
          metodo_pago_divisa: string;
          nro_presupuesto: number | null;
          otros_gastos_cliente: number | null;
          tiempo_vigencia: string | null;
          valido_hasta: string | null;
        };
        Insert: {
          fecha_emision?: string | null;
          id?: number;
          id_datos_bancarios?: number | null;
          id_estatus?: number | null;
          id_trato?: number | null;
          metodo_pago_divisa?: string;
          nro_presupuesto?: number | null;
          otros_gastos_cliente?: number | null;
          tiempo_vigencia?: string | null;
          valido_hasta?: string | null;
        };
        Update: {
          fecha_emision?: string | null;
          id?: number;
          id_datos_bancarios?: number | null;
          id_estatus?: number | null;
          id_trato?: number | null;
          metodo_pago_divisa?: string;
          nro_presupuesto?: number | null;
          otros_gastos_cliente?: number | null;
          tiempo_vigencia?: string | null;
          valido_hasta?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fk_presupuestos_datos_bancarios";
            columns: ["id_datos_bancarios"];
            isOneToOne: false;
            referencedRelation: "datos_bancarios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "presupuestos_id_estatus_fkey";
            columns: ["id_estatus"];
            isOneToOne: false;
            referencedRelation: "conf_estatus";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "presupuestos_id_negocio_fkey";
            columns: ["id_trato"];
            isOneToOne: false;
            referencedRelation: "tratos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "presupuestos_id_negocio_fkey";
            columns: ["id_trato"];
            isOneToOne: false;
            referencedRelation: "v_ecc_preview_context";
            referencedColumns: ["trato_table_id"];
          },
          {
            foreignKeyName: "presupuestos_id_negocio_fkey";
            columns: ["id_trato"];
            isOneToOne: false;
            referencedRelation: "v_funnel_comercial_detallado";
            referencedColumns: ["trato_id"];
          },
        ];
      };
      proveedores: {
        Row: {
          cedula_contacto: string | null;
          direccion_fiscal: string | null;
          direccion_referencia: string | null;
          email: string | null;
          fuente: string | null;
          id: number;
          id_ciudad: number | null;
          id_estado_geografico: number | null;
          id_estatus: number | null;
          nombre_razon_social: string;
          notas_observaciones: string | null;
          persona_contacto: string | null;
          producto_servicio_admin: string | null;
          rif_proveedor: string | null;
          telefono: string | null;
          tipo_impacto: string | null;
        };
        Insert: {
          cedula_contacto?: string | null;
          direccion_fiscal?: string | null;
          direccion_referencia?: string | null;
          email?: string | null;
          fuente?: string | null;
          id?: number;
          id_ciudad?: number | null;
          id_estado_geografico?: number | null;
          id_estatus?: number | null;
          nombre_razon_social: string;
          notas_observaciones?: string | null;
          persona_contacto?: string | null;
          producto_servicio_admin?: string | null;
          rif_proveedor?: string | null;
          telefono?: string | null;
          tipo_impacto?: string | null;
        };
        Update: {
          cedula_contacto?: string | null;
          direccion_fiscal?: string | null;
          direccion_referencia?: string | null;
          email?: string | null;
          fuente?: string | null;
          id?: number;
          id_ciudad?: number | null;
          id_estado_geografico?: number | null;
          id_estatus?: number | null;
          nombre_razon_social?: string;
          notas_observaciones?: string | null;
          persona_contacto?: string | null;
          producto_servicio_admin?: string | null;
          rif_proveedor?: string | null;
          telefono?: string | null;
          tipo_impacto?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "proveedores_id_ciudad_fkey";
            columns: ["id_ciudad"];
            isOneToOne: false;
            referencedRelation: "cat_ciudades";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "proveedores_id_estado_geografico_fkey";
            columns: ["id_estado_geografico"];
            isOneToOne: false;
            referencedRelation: "cat_estados_venezuela";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "proveedores_id_estatus_fkey";
            columns: ["id_estatus"];
            isOneToOne: false;
            referencedRelation: "conf_estatus";
            referencedColumns: ["id"];
          },
        ];
      };
      puestos_empleados: {
        Row: {
          cargo: string | null;
          id: number;
          id_departamento: number | null;
          id_empleado: number | null;
        };
        Insert: {
          cargo?: string | null;
          id?: number;
          id_departamento?: number | null;
          id_empleado?: number | null;
        };
        Update: {
          cargo?: string | null;
          id?: number;
          id_departamento?: number | null;
          id_empleado?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "puestos_empleados_id_departamento_fkey";
            columns: ["id_departamento"];
            isOneToOne: false;
            referencedRelation: "departamentos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "puestos_empleados_id_empleado_fkey";
            columns: ["id_empleado"];
            isOneToOne: false;
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          },
        ];
      };
      requisiciones: {
        Row: {
          cantidad: number | null;
          dias_traslado: number | null;
          fecha_solicitud: string | null;
          id: number;
          id_estatus: number | null;
          id_osi: number | null;
          id_proveedor_sugerido: number | null;
          item_solicitado: string | null;
          observaciones_compras: string | null;
          tipo_solicitud: string | null;
        };
        Insert: {
          cantidad?: number | null;
          dias_traslado?: number | null;
          fecha_solicitud?: string | null;
          id?: number;
          id_estatus?: number | null;
          id_osi?: number | null;
          id_proveedor_sugerido?: number | null;
          item_solicitado?: string | null;
          observaciones_compras?: string | null;
          tipo_solicitud?: string | null;
        };
        Update: {
          cantidad?: number | null;
          dias_traslado?: number | null;
          fecha_solicitud?: string | null;
          id?: number;
          id_estatus?: number | null;
          id_osi?: number | null;
          id_proveedor_sugerido?: number | null;
          item_solicitado?: string | null;
          observaciones_compras?: string | null;
          tipo_solicitud?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "requisiciones_id_estatus_fkey";
            columns: ["id_estatus"];
            isOneToOne: false;
            referencedRelation: "conf_estatus";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "requisiciones_id_osi_fkey";
            columns: ["id_osi"];
            isOneToOne: false;
            referencedRelation: "ejecucion_osi";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "requisiciones_id_osi_fkey";
            columns: ["id_osi"];
            isOneToOne: false;
            referencedRelation: "v_osi_formato_completo";
            referencedColumns: ["id_osi"];
          },
          {
            foreignKeyName: "requisiciones_id_proveedor_sugerido_fkey";
            columns: ["id_proveedor_sugerido"];
            isOneToOne: false;
            referencedRelation: "proveedores";
            referencedColumns: ["id"];
          },
        ];
      };
      rr_ejecutivos_pool: {
        Row: {
          created_at: string;
          esta_activo: boolean;
          id: number;
          prioridad: number;
          usuario_id: number;
        };
        Insert: {
          created_at?: string;
          esta_activo?: boolean;
          id?: number;
          prioridad?: number;
          usuario_id: number;
        };
        Update: {
          created_at?: string;
          esta_activo?: boolean;
          id?: number;
          prioridad?: number;
          usuario_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "rr_ejecutivos_pool_usuario_id_fkey";
            columns: ["usuario_id"];
            isOneToOne: true;
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          },
        ];
      };
      servicio_modalidades_permitidas: {
        Row: {
          id_modalidad: number;
          id_servicio: number;
        };
        Insert: {
          id_modalidad: number;
          id_servicio: number;
        };
        Update: {
          id_modalidad?: number;
          id_servicio?: number;
        };
        Relationships: [
          {
            foreignKeyName: "servicio_modalidades_permitidas_id_modalidad_fkey";
            columns: ["id_modalidad"];
            isOneToOne: false;
            referencedRelation: "modalidades";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "servicio_modalidades_permitidas_id_servicio_fkey";
            columns: ["id_servicio"];
            isOneToOne: false;
            referencedRelation: "catalogo_servicios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "servicio_modalidades_permitidas_id_servicio_fkey";
            columns: ["id_servicio"];
            isOneToOne: false;
            referencedRelation: "v_osi_formato_completo";
            referencedColumns: ["id_servicio"];
          },
        ];
      };
      suplencias_ejecutivos: {
        Row: {
          created_at: string;
          created_by_usuario_id: number | null;
          esta_activa: boolean;
          fecha_fin: string;
          fecha_inicio: string;
          id: number;
          id_ejecutivo_suplente: number;
          id_ejecutivo_titular: number;
        };
        Insert: {
          created_at?: string;
          created_by_usuario_id?: number | null;
          esta_activa?: boolean;
          fecha_fin: string;
          fecha_inicio: string;
          id?: number;
          id_ejecutivo_suplente: number;
          id_ejecutivo_titular: number;
        };
        Update: {
          created_at?: string;
          created_by_usuario_id?: number | null;
          esta_activa?: boolean;
          fecha_fin?: string;
          fecha_inicio?: string;
          id?: number;
          id_ejecutivo_suplente?: number;
          id_ejecutivo_titular?: number;
        };
        Relationships: [
          {
            foreignKeyName: "suplencias_ejecutivos_created_by_usuario_id_fkey";
            columns: ["created_by_usuario_id"];
            isOneToOne: false;
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "suplencias_ejecutivos_id_ejecutivo_suplente_fkey";
            columns: ["id_ejecutivo_suplente"];
            isOneToOne: false;
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "suplencias_ejecutivos_id_ejecutivo_titular_fkey";
            columns: ["id_ejecutivo_titular"];
            isOneToOne: false;
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          },
        ];
      };
      tipo_servicio: {
        Row: {
          id: number;
          nombre: string;
        };
        Insert: {
          id?: number;
          nombre: string;
        };
        Update: {
          id?: number;
          nombre?: string;
        };
        Relationships: [];
      };
      tratos: {
        Row: {
          condicion_pago: string | null;
          fecha_creacion: string | null;
          id: number;
          id_contacto: number;
          id_ejecutivo_responsable: number | null;
          id_empresa: number | null;
          id_estatus: number | null;
          id_servicio: number | null;
          monto_estimado: number | null;
          resultado_atencion: string | null;
          tipo_participante: string | null;
        };
        Insert: {
          condicion_pago?: string | null;
          fecha_creacion?: string | null;
          id?: number;
          id_contacto: number;
          id_ejecutivo_responsable?: number | null;
          id_empresa?: number | null;
          id_estatus?: number | null;
          id_servicio?: number | null;
          monto_estimado?: number | null;
          resultado_atencion?: string | null;
          tipo_participante?: string | null;
        };
        Update: {
          condicion_pago?: string | null;
          fecha_creacion?: string | null;
          id?: number;
          id_contacto?: number;
          id_ejecutivo_responsable?: number | null;
          id_empresa?: number | null;
          id_estatus?: number | null;
          id_servicio?: number | null;
          monto_estimado?: number | null;
          resultado_atencion?: string | null;
          tipo_participante?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tratos_id_contacto_fkey";
            columns: ["id_contacto"];
            isOneToOne: false;
            referencedRelation: "contactos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tratos_id_empleado_atiende_fkey";
            columns: ["id_ejecutivo_responsable"];
            isOneToOne: false;
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tratos_id_empresa_fkey";
            columns: ["id_empresa"];
            isOneToOne: false;
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tratos_id_empresa_fkey";
            columns: ["id_empresa"];
            isOneToOne: false;
            referencedRelation: "v_osi_formato_completo";
            referencedColumns: ["id_empresa"];
          },
          {
            foreignKeyName: "tratos_id_estatus_fkey";
            columns: ["id_estatus"];
            isOneToOne: false;
            referencedRelation: "conf_estatus";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tratos_id_servicio_fkey";
            columns: ["id_servicio"];
            isOneToOne: false;
            referencedRelation: "catalogo_servicios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tratos_id_servicio_fkey";
            columns: ["id_servicio"];
            isOneToOne: false;
            referencedRelation: "v_osi_formato_completo";
            referencedColumns: ["id_servicio"];
          },
        ];
      };
      unidades_servidor: {
        Row: {
          actualizado_en: string;
          creado_en: string;
          descripcion: string | null;
          id: number;
          letra_unidad: string;
          nombre_servidor: string;
          nombre_visual: string | null;
        };
        Insert: {
          actualizado_en?: string;
          creado_en?: string;
          descripcion?: string | null;
          id?: number;
          letra_unidad: string;
          nombre_servidor: string;
          nombre_visual?: string | null;
        };
        Update: {
          actualizado_en?: string;
          creado_en?: string;
          descripcion?: string | null;
          id?: number;
          letra_unidad?: string;
          nombre_servidor?: string;
          nombre_visual?: string | null;
        };
        Relationships: [];
      };
      usuarios: {
        Row: {
          cedula: string | null;
          departamento: number | null;
          email_corporativo: string | null;
          esta_activo: boolean | null;
          id: number;
          id_auth: string | null;
          nombre_apellido: string;
          telefono: string | null;
        };
        Insert: {
          cedula?: string | null;
          departamento?: number | null;
          email_corporativo?: string | null;
          esta_activo?: boolean | null;
          id?: number;
          id_auth?: string | null;
          nombre_apellido: string;
          telefono?: string | null;
        };
        Update: {
          cedula?: string | null;
          departamento?: number | null;
          email_corporativo?: string | null;
          esta_activo?: boolean | null;
          id?: number;
          id_auth?: string | null;
          nombre_apellido?: string;
          telefono?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "usuarios_departamento_fkey";
            columns: ["departamento"];
            isOneToOne: false;
            referencedRelation: "departamentos";
            referencedColumns: ["id"];
          },
        ];
      };
      usuarios_unidades: {
        Row: {
          creado_en: string;
          id: number;
          nivel_permiso: string | null;
          solo_lectura: boolean | null;
          unidad_servidor_id: number;
          usuario_id: number;
        };
        Insert: {
          creado_en?: string;
          id?: number;
          nivel_permiso?: string | null;
          solo_lectura?: boolean | null;
          unidad_servidor_id: number;
          usuario_id: number;
        };
        Update: {
          creado_en?: string;
          id?: number;
          nivel_permiso?: string | null;
          solo_lectura?: boolean | null;
          unidad_servidor_id?: number;
          usuario_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "fk_usuarios_unidades_unidad";
            columns: ["unidad_servidor_id"];
            isOneToOne: false;
            referencedRelation: "unidades_servidor";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_usuarios_unidades_usuario";
            columns: ["usuario_id"];
            isOneToOne: false;
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          },
        ];
      };
      viaticos_detalles: {
        Row: {
          concepto: string | null;
          fecha_gasto: string | null;
          id: number;
          id_empleado_gasto: number | null;
          id_viatico_enc: number | null;
          monto_gasto: number;
          nro_factura: string | null;
          soporte_digital_url: string | null;
        };
        Insert: {
          concepto?: string | null;
          fecha_gasto?: string | null;
          id?: number;
          id_empleado_gasto?: number | null;
          id_viatico_enc?: number | null;
          monto_gasto: number;
          nro_factura?: string | null;
          soporte_digital_url?: string | null;
        };
        Update: {
          concepto?: string | null;
          fecha_gasto?: string | null;
          id?: number;
          id_empleado_gasto?: number | null;
          id_viatico_enc?: number | null;
          monto_gasto?: number;
          nro_factura?: string | null;
          soporte_digital_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "viaticos_detalles_id_empleado_gasto_fkey";
            columns: ["id_empleado_gasto"];
            isOneToOne: false;
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "viaticos_detalles_id_viatico_enc_fkey";
            columns: ["id_viatico_enc"];
            isOneToOne: false;
            referencedRelation: "viaticos_encabezado";
            referencedColumns: ["id"];
          },
        ];
      };
      viaticos_encabezado: {
        Row: {
          diferencia_reembolso: number | null;
          fecha_ida: string | null;
          fecha_retorno: string | null;
          fecha_solicitud: string | null;
          id: number;
          id_autorizado_por: number | null;
          id_departamento: number | null;
          id_elaborado_por: number | null;
          id_estatus: number | null;
          id_osi: number | null;
          id_responsable_pago: number | null;
          motivo_viaje: string | null;
          observaciones: string | null;
          total_consumido: number | null;
          total_recibido: number | null;
        };
        Insert: {
          diferencia_reembolso?: number | null;
          fecha_ida?: string | null;
          fecha_retorno?: string | null;
          fecha_solicitud?: string | null;
          id?: number;
          id_autorizado_por?: number | null;
          id_departamento?: number | null;
          id_elaborado_por?: number | null;
          id_estatus?: number | null;
          id_osi?: number | null;
          id_responsable_pago?: number | null;
          motivo_viaje?: string | null;
          observaciones?: string | null;
          total_consumido?: number | null;
          total_recibido?: number | null;
        };
        Update: {
          diferencia_reembolso?: number | null;
          fecha_ida?: string | null;
          fecha_retorno?: string | null;
          fecha_solicitud?: string | null;
          id?: number;
          id_autorizado_por?: number | null;
          id_departamento?: number | null;
          id_elaborado_por?: number | null;
          id_estatus?: number | null;
          id_osi?: number | null;
          id_responsable_pago?: number | null;
          motivo_viaje?: string | null;
          observaciones?: string | null;
          total_consumido?: number | null;
          total_recibido?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "viaticos_encabezado_id_autorizado_por_fkey";
            columns: ["id_autorizado_por"];
            isOneToOne: false;
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "viaticos_encabezado_id_departamento_fkey";
            columns: ["id_departamento"];
            isOneToOne: false;
            referencedRelation: "departamentos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "viaticos_encabezado_id_elaborado_por_fkey";
            columns: ["id_elaborado_por"];
            isOneToOne: false;
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "viaticos_encabezado_id_estatus_fkey";
            columns: ["id_estatus"];
            isOneToOne: false;
            referencedRelation: "conf_estatus";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "viaticos_encabezado_id_osi_fkey";
            columns: ["id_osi"];
            isOneToOne: false;
            referencedRelation: "ejecucion_osi";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "viaticos_encabezado_id_osi_fkey";
            columns: ["id_osi"];
            isOneToOne: false;
            referencedRelation: "v_osi_formato_completo";
            referencedColumns: ["id_osi"];
          },
          {
            foreignKeyName: "viaticos_encabezado_id_responsable_pago_fkey";
            columns: ["id_responsable_pago"];
            isOneToOne: false;
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          },
        ];
      };
      viaticos_participantes: {
        Row: {
          id_empleado: number;
          id_viatico_enc: number;
        };
        Insert: {
          id_empleado: number;
          id_viatico_enc: number;
        };
        Update: {
          id_empleado?: number;
          id_viatico_enc?: number;
        };
        Relationships: [
          {
            foreignKeyName: "viaticos_participantes_id_empleado_fkey";
            columns: ["id_empleado"];
            isOneToOne: false;
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "viaticos_participantes_id_viatico_enc_fkey";
            columns: ["id_viatico_enc"];
            isOneToOne: false;
            referencedRelation: "viaticos_encabezado";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      analytics_metrics: {
        Row: {
          active_carnets: number | null;
          active_certificates: number | null;
          average_score: number | null;
          carnets_this_month: number | null;
          carnets_this_year: number | null;
          cedula_e_count: number | null;
          cedula_v_count: number | null;
          certificates_by_state: Json | null;
          certificates_this_month: number | null;
          certificates_this_year: number | null;
          expiration_timeline: Json | null;
          expired_carnets: number | null;
          expired_certificates: number | null;
          foreign_count: number | null;
          inactive_carnets: number | null;
          inactive_certificates: number | null;
          last_updated: string | null;
          max_score: number | null;
          min_score: number | null;
          monthly_emissions: Json | null;
          no_expiration_certificates: number | null;
          top_companies: Json | null;
          top_courses: Json | null;
          top_facilitators: Json | null;
          total_carnets: number | null;
          total_certificates: number | null;
          total_participants: number | null;
          unique_companies_with_carnets: number | null;
          unique_companies_with_certificates: number | null;
          unique_courses_with_carnets: number | null;
          unique_courses_with_certificates: number | null;
          unique_facilitators_with_certificates: number | null;
          unique_nationalities: number | null;
          unique_osis_with_carnets: number | null;
          unique_participants_with_carnets: number | null;
          unique_participants_with_certificates: number | null;
          unique_states_with_certificates: number | null;
          valid_carnets: number | null;
          valid_certificates: number | null;
          venezuelan_count: number | null;
        };
        Relationships: [];
      };
      v_ecc_detalle_legible: {
        Row: {
          aplica: boolean | null;
          cantidad: number | null;
          categoria_costo: string | null;
          concepto: string | null;
          costo_aplicado: number | null;
          id_ecc: number | null;
          id_trato: number | null;
          linea_id: number | null;
          precio_venta_sugerido: number | null;
          subtotal_real: number | null;
          unidad_medida: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ecc_detalle_lineas_id_ecc_fkey";
            columns: ["id_ecc"];
            isOneToOne: false;
            referencedRelation: "ecc_encabezado";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ecc_detalle_lineas_id_ecc_fkey";
            columns: ["id_ecc"];
            isOneToOne: false;
            referencedRelation: "v_ecc_preview_context";
            referencedColumns: ["ecc_id"];
          },
          {
            foreignKeyName: "ecc_detalle_lineas_id_ecc_fkey";
            columns: ["id_ecc"];
            isOneToOne: false;
            referencedRelation: "v_ecc_resumen";
            referencedColumns: ["id_ecc"];
          },
          {
            foreignKeyName: "ecc_detalle_lineas_id_ecc_fkey";
            columns: ["id_ecc"];
            isOneToOne: false;
            referencedRelation: "v_funnel_comercial_detallado";
            referencedColumns: ["ecc_id"];
          },
          {
            foreignKeyName: "ecc_encabezado_id_trato_fkey";
            columns: ["id_trato"];
            isOneToOne: false;
            referencedRelation: "tratos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ecc_encabezado_id_trato_fkey";
            columns: ["id_trato"];
            isOneToOne: false;
            referencedRelation: "v_ecc_preview_context";
            referencedColumns: ["trato_table_id"];
          },
          {
            foreignKeyName: "ecc_encabezado_id_trato_fkey";
            columns: ["id_trato"];
            isOneToOne: false;
            referencedRelation: "v_funnel_comercial_detallado";
            referencedColumns: ["trato_id"];
          },
        ];
      };
      v_ecc_preview_context: {
        Row: {
          contacto_apellido: string | null;
          contacto_nombre: string | null;
          ecc_id: number | null;
          ejecutivo_nombre_apellido: string | null;
          empresa_razon_social: string | null;
          id_contacto: number | null;
          id_empresa: number | null;
          id_estatus: number | null;
          id_servicio: number | null;
          id_trato: number | null;
          trato_ejecutivo_id: number | null;
          trato_table_id: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "ecc_encabezado_id_estatus_fkey";
            columns: ["id_estatus"];
            isOneToOne: false;
            referencedRelation: "conf_estatus";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ecc_encabezado_id_servicio_fkey";
            columns: ["id_servicio"];
            isOneToOne: false;
            referencedRelation: "catalogo_servicios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ecc_encabezado_id_servicio_fkey";
            columns: ["id_servicio"];
            isOneToOne: false;
            referencedRelation: "v_osi_formato_completo";
            referencedColumns: ["id_servicio"];
          },
          {
            foreignKeyName: "ecc_encabezado_id_trato_fkey";
            columns: ["id_trato"];
            isOneToOne: false;
            referencedRelation: "tratos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ecc_encabezado_id_trato_fkey";
            columns: ["id_trato"];
            isOneToOne: false;
            referencedRelation: "v_ecc_preview_context";
            referencedColumns: ["trato_table_id"];
          },
          {
            foreignKeyName: "ecc_encabezado_id_trato_fkey";
            columns: ["id_trato"];
            isOneToOne: false;
            referencedRelation: "v_funnel_comercial_detallado";
            referencedColumns: ["trato_id"];
          },
          {
            foreignKeyName: "tratos_id_contacto_fkey";
            columns: ["id_contacto"];
            isOneToOne: false;
            referencedRelation: "contactos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tratos_id_empleado_atiende_fkey";
            columns: ["trato_ejecutivo_id"];
            isOneToOne: false;
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tratos_id_empresa_fkey";
            columns: ["id_empresa"];
            isOneToOne: false;
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tratos_id_empresa_fkey";
            columns: ["id_empresa"];
            isOneToOne: false;
            referencedRelation: "v_osi_formato_completo";
            referencedColumns: ["id_empresa"];
          },
        ];
      };
      v_ecc_resumen: {
        Row: {
          estatus: string | null;
          horas_totales: number | null;
          id_ecc: number | null;
          monto_gastos_admin: number | null;
          monto_utilidad: number | null;
          participantes: number | null;
          precio_por_persona: number | null;
          subtotal_costos_directos: number | null;
          total_general: number | null;
        };
        Relationships: [];
      };
      v_funnel_comercial_detallado: {
        Row: {
          cliente: string | null;
          dias_lead_a_trato: number | null;
          dias_trato_a_ecc: number | null;
          ecc_id: number | null;
          estatus_trato: string | null;
          fecha_aprobacion_ecc: string | null;
          fecha_creacion_trato: string | null;
          fecha_emision_presupuesto: string | null;
          fecha_registro_lead: string | null;
          lead_id: number | null;
          lead_nombre: string | null;
          monto_item_presupuesto_iva: number | null;
          monto_neto_ecc: number | null;
          nro_presupuesto: number | null;
          servicio_especifico_ecc: string | null;
          servicio_trato_referencia: string | null;
          tiempo_total_conversion: number | null;
          trato_id: number | null;
          vencimiento_presupuesto: string | null;
        };
        Relationships: [];
      };
      v_osi_formato_completo: {
        Row: {
          carnet_impreso: boolean | null;
          certificado_impreso: boolean | null;
          cliente_rif: string | null;
          codigo_cliente: number | null;
          contacto_email: string | null;
          contacto_telefono: string | null;
          contenido_servicio: string | null;
          costo_bateria: number | null;
          costo_carnetizacion: number | null;
          costo_dias_especialista: number | null;
          costo_honorarios_instructor: number | null;
          costo_hospedaje: number | null;
          costo_impresion_material: number | null;
          costo_logistica_comida: number | null;
          costo_otros: number | null;
          costo_pop: number | null;
          costo_traslado: number | null;
          dias_hospedaje_facilitador: number | null;
          dias_logistica_facilitador: number | null;
          direccion_ejecucion: string | null;
          direccion_ejecucion_real: string | null;
          direccion_envio: string | null;
          direccion_fiscal: string | null;
          ejecutivo_negocios: string | null;
          fecha_emision: string | null;
          fecha_emision_presupuesto: string | null;
          fecha_fin_real: string | null;
          fecha_firma_administracion: string | null;
          fecha_firma_calidad: string | null;
          fecha_firma_direccion: string | null;
          fecha_firma_negocios: string | null;
          fecha_firma_verificacion: string | null;
          fecha_inicio_real: string | null;
          hora_inicio_servicio: string | null;
          horas_academicas_ejecucion: number | null;
          horas_academicas_solped: number | null;
          horas_honorarios_instructor: number | null;
          id_ciudad_direccion_contrato: number | null;
          id_ciudad_direccion_ejecucion_efectiva: number | null;
          id_direccion_ejecucion_real: number | null;
          id_direccion_ejecucion_solped: number | null;
          id_ecc_actual: number | null;
          id_ecc_origen: number | null;
          id_empresa: number | null;
          id_estado_direccion_contrato: number | null;
          id_estado_direccion_ejecucion_efectiva: number | null;
          id_estatus: number | null;
          id_osi: number | null;
          id_servicio: number | null;
          id_trato: number | null;
          impacto_ecc_delta: number | null;
          impacto_ecc_en: string | null;
          impacto_ecc_pendiente: boolean | null;
          impacto_ecc_resuelto_por: string | null;
          nombre_empresa: string | null;
          nro_osi: string | null;
          nro_presupuesto: number | null;
          observaciones_totales: string | null;
          participantes_ejecucion: number | null;
          participantes_max_solped: number | null;
          persona_contacto: string | null;
          pop_incluido: boolean | null;
          pretensiones_totales: string | null;
          requiere_audiovisuales: boolean | null;
          responsable_recepcion: string | null;
          servicio: string | null;
          sesiones_ejecucion: number | null;
          sesiones_programadas: Json | null;
          sesiones_solped: number | null;
          tarifa_hora_honorarios: number | null;
          tipo_servicio: string | null;
          traslado_externo: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "direcciones_cliente_id_ciudad_fkey";
            columns: ["id_ciudad_direccion_contrato"];
            isOneToOne: false;
            referencedRelation: "cat_ciudades";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "direcciones_cliente_id_estado_fkey";
            columns: ["id_estado_direccion_contrato"];
            isOneToOne: false;
            referencedRelation: "cat_estados_venezuela";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ecc_encabezado_id_direccion_ejecucion_solped_fkey";
            columns: ["id_direccion_ejecucion_solped"];
            isOneToOne: false;
            referencedRelation: "direcciones_cliente";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ecc_encabezado_id_trato_fkey";
            columns: ["id_trato"];
            isOneToOne: false;
            referencedRelation: "tratos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ecc_encabezado_id_trato_fkey";
            columns: ["id_trato"];
            isOneToOne: false;
            referencedRelation: "v_ecc_preview_context";
            referencedColumns: ["trato_table_id"];
          },
          {
            foreignKeyName: "ecc_encabezado_id_trato_fkey";
            columns: ["id_trato"];
            isOneToOne: false;
            referencedRelation: "v_funnel_comercial_detallado";
            referencedColumns: ["trato_id"];
          },
          {
            foreignKeyName: "ejecucion_osi_id_direccion_ejecucion_real_fkey";
            columns: ["id_direccion_ejecucion_real"];
            isOneToOne: false;
            referencedRelation: "direcciones_cliente";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ejecucion_osi_id_ecc_fkey";
            columns: ["id_ecc_actual"];
            isOneToOne: false;
            referencedRelation: "ecc_encabezado";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ejecucion_osi_id_ecc_fkey";
            columns: ["id_ecc_actual"];
            isOneToOne: false;
            referencedRelation: "v_ecc_preview_context";
            referencedColumns: ["ecc_id"];
          },
          {
            foreignKeyName: "ejecucion_osi_id_ecc_fkey";
            columns: ["id_ecc_actual"];
            isOneToOne: false;
            referencedRelation: "v_ecc_resumen";
            referencedColumns: ["id_ecc"];
          },
          {
            foreignKeyName: "ejecucion_osi_id_ecc_fkey";
            columns: ["id_ecc_actual"];
            isOneToOne: false;
            referencedRelation: "v_funnel_comercial_detallado";
            referencedColumns: ["ecc_id"];
          },
          {
            foreignKeyName: "ejecucion_osi_id_estatus_fkey";
            columns: ["id_estatus"];
            isOneToOne: false;
            referencedRelation: "conf_estatus";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      can_mutate_contacto: {
        Args: { p_contacto_id: number };
        Returns: boolean;
      };
      can_mutate_empresa: { Args: { p_empresa_id: number }; Returns: boolean };
      can_mutate_marketing_lead: {
        Args: { p_lead_id: number };
        Returns: boolean;
      };
      can_mutate_trato: { Args: { p_trato_id: number }; Returns: boolean };
      fn_generar_presupuesto_desde_ecc:
        | {
            Args: {
              p_id_banco: number;
              p_id_eccs: number[];
              p_solo_previsualizar?: boolean;
              p_vigencia_dias?: number;
            };
            Returns: {
              descripcion_comercial: string;
              id_ecc_ref: number;
              id_trato_ref: number;
              iva: number;
              neto: number;
              total_con_iva: number;
            }[];
          }
        | {
            Args: {
              p_id_banco: number;
              p_id_eccs: number[];
              p_vigencia_dias?: number;
            };
            Returns: number;
          };
      fn_get_next_lead_owner_round_robin: { Args: never; Returns: number };
      fn_mark_cliente_from_trato: {
        Args: { p_trato_id: number };
        Returns: undefined;
      };
      fn_procesar_ecc:
        | {
            Args: { p_id_ecc: number; p_solo_previsualizar?: boolean };
            Returns: {
              cantidad: number;
              concepto: string;
              costo_unitario: number;
              subtotal: number;
              tipo_registro: string;
            }[];
          }
        | {
            Args: {
              p_id_ecc: number;
              p_items_excluidos?: number[];
              p_solo_previsualizar?: boolean;
            };
            Returns: {
              aplica: boolean;
              cantidad: number;
              concepto: string;
              costo_unitario: number;
              id_item: number;
              subtotal: number;
              tipo_registro: string;
            }[];
          }
        | {
            Args: {
              p_id_ecc: number;
              p_items_excluidos?: number[];
              p_reiniciar_desde_catalogo?: boolean;
              p_solo_previsualizar?: boolean;
            };
            Returns: {
              aplica: boolean;
              cantidad: number;
              concepto: string;
              costo_unitario: number;
              id_item: number;
              subtotal: number;
              tipo_registro: string;
            }[];
          };
      fn_sync_osi_dates_from_sessions: {
        Args: { p_id_osi: number };
        Returns: undefined;
      };
      get_certificate_metrics: {
        Args: {
          p_company_id?: number;
          p_course_id?: number;
          p_date_from?: string;
          p_date_to?: string;
          p_is_active?: boolean;
          p_search_term?: string;
        };
        Returns: Json;
      };
      get_my_app_context: { Args: { target_app_slug: string }; Returns: Json };
      get_my_notifications_cursor: {
        Args: {
          p_app_slug?: string;
          p_before?: string;
          p_event_key?: string;
          p_limit?: number;
          p_search?: string;
        };
        Returns: {
          app_slug: string;
          body: string;
          created_at: string;
          event_key: string;
          id: string;
          link_path: string;
          metadata: Json;
          priority: number;
          read_at: string;
          title: string;
        }[];
      };
      get_next_control_numbers: {
        Args: { batch_size?: number };
        Returns: Json;
      };
      get_pending_high_priority_email: {
        Args: { p_limit?: number; p_older_than?: string };
        Returns: {
          body: string;
          created_at: string;
          inbox_id: string;
          link_path: string;
          recipient_id_auth: string;
          title: string;
        }[];
      };
      get_user_permissions_by_app: {
        Args: { p_usuario_id: number };
        Returns: {
          app_slug: string;
          permission_slug: string;
        }[];
      };
      get_user_roles_by_app: {
        Args: { p_usuario_id: number };
        Returns: {
          app_slug: string;
          role_slug: string;
        }[];
      };
      is_admin_or_superadmin: { Args: never; Returns: boolean };
      is_app_admin: {
        Args: { target_app_id: number; target_user_id: number };
        Returns: boolean;
      };
      is_rr_pool_sales_user: {
        Args: { p_usuario_id: number };
        Returns: boolean;
      };
      is_suplente_activo: {
        Args: { p_suplente_id: number; p_titular_id: number };
        Returns: boolean;
      };
      mark_all_read: { Args: never; Returns: number };
      mark_notification_read: {
        Args: { p_notification_id: string };
        Returns: boolean;
      };
      next_ejecucion_osi_nro_secuencial: { Args: never; Returns: string };
      notify_osi_change_saved: {
        Args: {
          p_change_type: string;
          p_dedupe_key?: string;
          p_id_osi: number;
          p_summary: string;
        };
        Returns: undefined;
      };
      notify_solped_cancelled: {
        Args: { p_dedupe_key?: string; p_id_ecc: number; p_source?: string };
        Returns: undefined;
      };
      notify_solped_change_saved:
        | {
            Args: {
              p_dedupe_key?: string;
              p_id_ecc: number;
              p_summary: string;
            };
            Returns: undefined;
          }
        | {
            Args: {
              p_changed_fields?: string[];
              p_dedupe_key?: string;
              p_id_ecc: number;
              p_summary: string;
            };
            Returns: undefined;
          };
      search_certificates: {
        Args: {
          p_company_id?: number;
          p_course_id?: number;
          p_date_from?: string;
          p_date_to?: string;
          p_facilitator_id?: number;
          p_is_active?: boolean;
          p_limit?: number;
          p_page?: number;
          p_search_term?: string;
          p_state_id?: number;
        };
        Returns: {
          calificacion: number;
          company_id: number;
          company_razon_social: string;
          company_rif: string;
          course_contenido: string;
          course_emite_carnet: boolean;
          course_horas_estimadas: number;
          course_id: number;
          course_nombre: string;
          course_nota_aprobatoria: number;
          created_at: string;
          facilitator_id: number;
          facilitator_nombre_apellido: string;
          fecha_emision: string;
          fecha_vencimiento: string;
          id: number;
          is_active: boolean;
          nro_osi: number;
          participant_cedula: string;
          participant_id: number;
          participant_nacionalidad: string;
          participant_nombre: string;
          state_id: number;
          state_nombre_estado: string;
          total_count: number;
        }[];
      };
    };
    Enums: {
      firma_tipo: "facilitador" | "representante_sha";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      firma_tipo: ["facilitador", "representante_sha"],
    },
  },
} as const;
