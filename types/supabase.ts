export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      actividad_maestra: {
        Row: {
          actor_user_id: number | null
          context_id: number
          context_type: string
          created_at: string
          documento_ref: string | null
          empresa_id: number | null
          id: number
          payload: Json
          servicio_id: number | null
          source_id: string | null
          source_table: string | null
          tipo_evento: string
        }
        Insert: {
          actor_user_id?: number | null
          context_id: number
          context_type: string
          created_at?: string
          documento_ref?: string | null
          empresa_id?: number | null
          id?: number
          payload?: Json
          servicio_id?: number | null
          source_id?: string | null
          source_table?: string | null
          tipo_evento: string
        }
        Update: {
          actor_user_id?: number | null
          context_id?: number
          context_type?: string
          created_at?: string
          documento_ref?: string | null
          empresa_id?: number | null
          id?: number
          payload?: Json
          servicio_id?: number | null
          source_id?: string | null
          source_table?: string | null
          tipo_evento?: string
        }
        Relationships: [
          {
            foreignKeyName: "actividad_maestra_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actividad_maestra_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "v_notify_permission_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "actividad_maestra_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "v_osi_app_role_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "actividad_maestra_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actividad_maestra_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_osi_formato_completo"
            referencedColumns: ["id_empresa"]
          },
          {
            foreignKeyName: "actividad_maestra_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_osi_lista"
            referencedColumns: ["id_empresa"]
          },
          {
            foreignKeyName: "actividad_maestra_servicio_id_fkey"
            columns: ["servicio_id"]
            isOneToOne: false
            referencedRelation: "catalogo_servicios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actividad_maestra_servicio_id_fkey"
            columns: ["servicio_id"]
            isOneToOne: false
            referencedRelation: "v_osi_formato_completo"
            referencedColumns: ["id_servicio"]
          },
        ]
      }
      adjuntos_contexto: {
        Row: {
          comentario_id: number | null
          context_id: number
          context_type: string
          created_at: string
          file_name: string
          id: number
          mime_type: string | null
          owner_user_id: number
          size_bytes: number | null
          storage_bucket: string
          storage_path: string
          tarea_id: number | null
        }
        Insert: {
          comentario_id?: number | null
          context_id: number
          context_type: string
          created_at?: string
          file_name: string
          id?: number
          mime_type?: string | null
          owner_user_id: number
          size_bytes?: number | null
          storage_bucket: string
          storage_path: string
          tarea_id?: number | null
        }
        Update: {
          comentario_id?: number | null
          context_id?: number
          context_type?: string
          created_at?: string
          file_name?: string
          id?: number
          mime_type?: string | null
          owner_user_id?: number
          size_bytes?: number | null
          storage_bucket?: string
          storage_path?: string
          tarea_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "adjuntos_contexto_comentario_id_fkey"
            columns: ["comentario_id"]
            isOneToOne: false
            referencedRelation: "comentarios_contexto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adjuntos_contexto_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adjuntos_contexto_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "v_notify_permission_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "adjuntos_contexto_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "v_osi_app_role_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "adjuntos_contexto_tarea_id_fkey"
            columns: ["tarea_id"]
            isOneToOne: false
            referencedRelation: "tareas_contexto"
            referencedColumns: ["id"]
          },
        ]
      }
      capacitacion_proceso_steps: {
        Row: {
          completed: boolean
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: number
          notes: string | null
          nro_sesion: number
          osi_id: number
          phase: string
          step_key: string
          step_metadata: Json | null
          updated_at: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: never
          notes?: string | null
          nro_sesion?: number
          osi_id: number
          phase: string
          step_key: string
          step_metadata?: Json | null
          updated_at?: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: never
          notes?: string | null
          nro_sesion?: number
          osi_id?: number
          phase?: string
          step_key?: string
          step_metadata?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      carnets: {
        Row: {
          cedula_participante: string
          created_at: string | null
          empresa_participante: string | null
          fecha_emision: string
          fecha_vencimiento: string | null
          id: number
          id_certificado: number | null
          id_curso: number | null
          id_empresa: number | null
          id_osi: number | null
          id_participante: number | null
          is_active: boolean
          nombre_participante: string
          qr_code: string | null
          snapshot_contenido: string | null
          subtitulo_curso: string | null
          titulo_curso: string
        }
        Insert: {
          cedula_participante: string
          created_at?: string | null
          empresa_participante?: string | null
          fecha_emision?: string
          fecha_vencimiento?: string | null
          id?: number
          id_certificado?: number | null
          id_curso?: number | null
          id_empresa?: number | null
          id_osi?: number | null
          id_participante?: number | null
          is_active?: boolean
          nombre_participante: string
          qr_code?: string | null
          snapshot_contenido?: string | null
          subtitulo_curso?: string | null
          titulo_curso: string
        }
        Update: {
          cedula_participante?: string
          created_at?: string | null
          empresa_participante?: string | null
          fecha_emision?: string
          fecha_vencimiento?: string | null
          id?: number
          id_certificado?: number | null
          id_curso?: number | null
          id_empresa?: number | null
          id_osi?: number | null
          id_participante?: number | null
          is_active?: boolean
          nombre_participante?: string
          qr_code?: string | null
          snapshot_contenido?: string | null
          subtitulo_curso?: string | null
          titulo_curso?: string
        }
        Relationships: [
          {
            foreignKeyName: "carnets_id_certificado_fkey"
            columns: ["id_certificado"]
            isOneToOne: true
            referencedRelation: "certificados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carnets_id_curso_fkey"
            columns: ["id_curso"]
            isOneToOne: false
            referencedRelation: "catalogo_servicios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carnets_id_curso_fkey"
            columns: ["id_curso"]
            isOneToOne: false
            referencedRelation: "v_osi_formato_completo"
            referencedColumns: ["id_servicio"]
          },
          {
            foreignKeyName: "carnets_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carnets_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "v_osi_formato_completo"
            referencedColumns: ["id_empresa"]
          },
          {
            foreignKeyName: "carnets_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "v_osi_lista"
            referencedColumns: ["id_empresa"]
          },
          {
            foreignKeyName: "carnets_id_participante_fkey"
            columns: ["id_participante"]
            isOneToOne: false
            referencedRelation: "participantes_certificados"
            referencedColumns: ["id"]
          },
        ]
      }
      cat_bancos: {
        Row: {
          codigo: string | null
          created_at: string | null
          id: number
          is_active: boolean | null
          nombre: string
        }
        Insert: {
          codigo?: string | null
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          nombre: string
        }
        Update: {
          codigo?: string | null
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          nombre?: string
        }
        Relationships: []
      }
      cat_ciudades: {
        Row: {
          id: number
          id_estado: number | null
          nombre_ciudad: string
        }
        Insert: {
          id?: number
          id_estado?: number | null
          nombre_ciudad: string
        }
        Update: {
          id?: number
          id_estado?: number | null
          nombre_ciudad?: string
        }
        Relationships: [
          {
            foreignKeyName: "cat_ciudades_id_estado_fkey"
            columns: ["id_estado"]
            isOneToOne: false
            referencedRelation: "cat_estados_venezuela"
            referencedColumns: ["id"]
          },
        ]
      }
      cat_estados_venezuela: {
        Row: {
          capital_estado: string | null
          id: number
          id_region: number | null
          nombre_estado: string
        }
        Insert: {
          capital_estado?: string | null
          id?: number
          id_region?: number | null
          nombre_estado: string
        }
        Update: {
          capital_estado?: string | null
          id?: number
          id_region?: number | null
          nombre_estado?: string
        }
        Relationships: [
          {
            foreignKeyName: "cat_estados_venezuela_id_region_fkey"
            columns: ["id_region"]
            isOneToOne: false
            referencedRelation: "cat_regiones"
            referencedColumns: ["id"]
          },
        ]
      }
      cat_origenes: {
        Row: {
          id: number
          id_empleado_asignado: number | null
          identificador: string | null
          medio: string
        }
        Insert: {
          id?: number
          id_empleado_asignado?: number | null
          identificador?: string | null
          medio: string
        }
        Update: {
          id?: number
          id_empleado_asignado?: number | null
          identificador?: string | null
          medio?: string
        }
        Relationships: [
          {
            foreignKeyName: "cat_origenes_id_empleado_fkey"
            columns: ["id_empleado_asignado"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cat_origenes_id_empleado_fkey"
            columns: ["id_empleado_asignado"]
            isOneToOne: false
            referencedRelation: "v_notify_permission_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "cat_origenes_id_empleado_fkey"
            columns: ["id_empleado_asignado"]
            isOneToOne: false
            referencedRelation: "v_osi_app_role_members"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      cat_regiones: {
        Row: {
          id: number
          nombre_region: string
        }
        Insert: {
          id?: number
          nombre_region: string
        }
        Update: {
          id?: number
          nombre_region?: string
        }
        Relationships: []
      }
      catalogo_servicios: {
        Row: {
          carga_horaria_std: number | null
          contenido_curso: string | null
          created_at: string | null
          emite_carnet: boolean | null
          esta_activo: boolean | null
          estatus: string | null
          id: number
          id_departamento_ejecutante: number | null
          nombre: string
          nota_aprobatoria: number | null
          subtitulo: string | null
          tipo_servicio: number | null
        }
        Insert: {
          carga_horaria_std?: number | null
          contenido_curso?: string | null
          created_at?: string | null
          emite_carnet?: boolean | null
          esta_activo?: boolean | null
          estatus?: string | null
          id?: number
          id_departamento_ejecutante?: number | null
          nombre: string
          nota_aprobatoria?: number | null
          subtitulo?: string | null
          tipo_servicio?: number | null
        }
        Update: {
          carga_horaria_std?: number | null
          contenido_curso?: string | null
          created_at?: string | null
          emite_carnet?: boolean | null
          esta_activo?: boolean | null
          estatus?: string | null
          id?: number
          id_departamento_ejecutante?: number | null
          nombre?: string
          nota_aprobatoria?: number | null
          subtitulo?: string | null
          tipo_servicio?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "catalogo_servicios_tipo_servicio_fkey"
            columns: ["tipo_servicio"]
            isOneToOne: false
            referencedRelation: "tipo_servicio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servicios_catalogo_id_departamento_ejecutante_fkey"
            columns: ["id_departamento_ejecutante"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      certificados: {
        Row: {
          calificacion: number
          created_at: string | null
          fecha_emision: string | null
          fecha_vencimiento: string | null
          id: number
          id_ciudad: number | null
          id_curso: number | null
          id_empresa: number | null
          id_estado: number | null
          id_facilitador: number | null
          id_participante: number | null
          id_plantilla_carnet: number | null
          id_plantilla_certificado: number | null
          id_sede: number | null
          is_active: boolean
          nro_control: number
          nro_hoja: number | null
          nro_libro: number | null
          nro_linea: number | null
          nro_osi: number | null
          qr_code: string | null
          snapshot_contenido: string | null
        }
        Insert: {
          calificacion?: number
          created_at?: string | null
          fecha_emision?: string | null
          fecha_vencimiento?: string | null
          id?: number
          id_ciudad?: number | null
          id_curso?: number | null
          id_empresa?: number | null
          id_estado?: number | null
          id_facilitador?: number | null
          id_participante?: number | null
          id_plantilla_carnet?: number | null
          id_plantilla_certificado?: number | null
          id_sede?: number | null
          is_active?: boolean
          nro_control: number
          nro_hoja?: number | null
          nro_libro?: number | null
          nro_linea?: number | null
          nro_osi?: number | null
          qr_code?: string | null
          snapshot_contenido?: string | null
        }
        Update: {
          calificacion?: number
          created_at?: string | null
          fecha_emision?: string | null
          fecha_vencimiento?: string | null
          id?: number
          id_ciudad?: number | null
          id_curso?: number | null
          id_empresa?: number | null
          id_estado?: number | null
          id_facilitador?: number | null
          id_participante?: number | null
          id_plantilla_carnet?: number | null
          id_plantilla_certificado?: number | null
          id_sede?: number | null
          is_active?: boolean
          nro_control?: number
          nro_hoja?: number | null
          nro_libro?: number | null
          nro_linea?: number | null
          nro_osi?: number | null
          qr_code?: string | null
          snapshot_contenido?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificados_id_ciudad_fkey"
            columns: ["id_ciudad"]
            isOneToOne: false
            referencedRelation: "cat_ciudades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificados_id_curso_fkey"
            columns: ["id_curso"]
            isOneToOne: false
            referencedRelation: "catalogo_servicios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificados_id_curso_fkey"
            columns: ["id_curso"]
            isOneToOne: false
            referencedRelation: "v_osi_formato_completo"
            referencedColumns: ["id_servicio"]
          },
          {
            foreignKeyName: "certificados_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificados_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "v_osi_formato_completo"
            referencedColumns: ["id_empresa"]
          },
          {
            foreignKeyName: "certificados_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "v_osi_lista"
            referencedColumns: ["id_empresa"]
          },
          {
            foreignKeyName: "certificados_id_estado_fkey"
            columns: ["id_estado"]
            isOneToOne: false
            referencedRelation: "cat_estados_venezuela"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificados_id_facilitador_fkey"
            columns: ["id_facilitador"]
            isOneToOne: false
            referencedRelation: "facilitadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificados_id_participante_fkey"
            columns: ["id_participante"]
            isOneToOne: false
            referencedRelation: "participantes_certificados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificados_id_plantilla_carnet_fkey"
            columns: ["id_plantilla_carnet"]
            isOneToOne: false
            referencedRelation: "plantillas_carnets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificados_id_plantilla_certificado_fkey"
            columns: ["id_plantilla_certificado"]
            isOneToOne: false
            referencedRelation: "plantillas_certificados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificados_id_sede_fkey"
            columns: ["id_sede"]
            isOneToOne: false
            referencedRelation: "empresa_sedes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificados_id_sede_fkey"
            columns: ["id_sede"]
            isOneToOne: false
            referencedRelation: "v_osi_formato_completo"
            referencedColumns: ["id_sede"]
          },
        ]
      }
      cliente_credenciales: {
        Row: {
          created_at: string | null
          display_name: string | null
          empresa_id: number
          id: number
          id_ciudad: number | null
          id_sede: number[] | null
          is_active: boolean | null
          password_hash: string
          updated_at: string | null
          username: string
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          empresa_id: number
          id?: number
          id_ciudad?: number | null
          id_sede?: number[] | null
          is_active?: boolean | null
          password_hash: string
          updated_at?: string | null
          username: string
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          empresa_id?: number
          id?: number
          id_ciudad?: number | null
          id_sede?: number[] | null
          is_active?: boolean | null
          password_hash?: string
          updated_at?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "cliente_credenciales_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_credenciales_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_osi_formato_completo"
            referencedColumns: ["id_empresa"]
          },
          {
            foreignKeyName: "cliente_credenciales_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_osi_lista"
            referencedColumns: ["id_empresa"]
          },
          {
            foreignKeyName: "cliente_credenciales_id_ciudad_fkey"
            columns: ["id_ciudad"]
            isOneToOne: false
            referencedRelation: "cat_ciudades"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          codigo_cliente: number | null
          created_at: string | null
          direccion_ejecucion: string | null
          direccion_envio: string | null
          direccion_fiscal: string | null
          ejecutivo_negocios: string | null
          email: string | null
          empresa: string | null
          estado: string | null
          fecha: string | null
          id: number
          medio_atraccion: string | null
          nombre_fiscal: string | null
          nro_contacto: string | null
          observaciones: string | null
          responsable_ejecucion: string | null
          rif: string | null
          solicitante: string | null
          telefono: string | null
          zona: string | null
        }
        Insert: {
          codigo_cliente?: number | null
          created_at?: string | null
          direccion_ejecucion?: string | null
          direccion_envio?: string | null
          direccion_fiscal?: string | null
          ejecutivo_negocios?: string | null
          email?: string | null
          empresa?: string | null
          estado?: string | null
          fecha?: string | null
          id?: never
          medio_atraccion?: string | null
          nombre_fiscal?: string | null
          nro_contacto?: string | null
          observaciones?: string | null
          responsable_ejecucion?: string | null
          rif?: string | null
          solicitante?: string | null
          telefono?: string | null
          zona?: string | null
        }
        Update: {
          codigo_cliente?: number | null
          created_at?: string | null
          direccion_ejecucion?: string | null
          direccion_envio?: string | null
          direccion_fiscal?: string | null
          ejecutivo_negocios?: string | null
          email?: string | null
          empresa?: string | null
          estado?: string | null
          fecha?: string | null
          id?: never
          medio_atraccion?: string | null
          nombre_fiscal?: string | null
          nro_contacto?: string | null
          observaciones?: string | null
          responsable_ejecucion?: string | null
          rif?: string | null
          solicitante?: string | null
          telefono?: string | null
          zona?: string | null
        }
        Relationships: []
      }
      comentario_entidad_vinculos: {
        Row: {
          comentario_id: number
          created_at: string
          entity_id: number
          entity_type: string
          id: number
          service_id: number | null
          service_name: string | null
          subtitle: string | null
        }
        Insert: {
          comentario_id: number
          created_at?: string
          entity_id: number
          entity_type: string
          id?: number
          service_id?: number | null
          service_name?: string | null
          subtitle?: string | null
        }
        Update: {
          comentario_id?: number
          created_at?: string
          entity_id?: number
          entity_type?: string
          id?: number
          service_id?: number | null
          service_name?: string | null
          subtitle?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comentario_entidad_vinculos_comentario_id_fkey"
            columns: ["comentario_id"]
            isOneToOne: false
            referencedRelation: "comentarios_contexto"
            referencedColumns: ["id"]
          },
        ]
      }
      comentario_menciones: {
        Row: {
          comentario_id: number
          created_at: string
          id: number
          mentioned_user_id: number
        }
        Insert: {
          comentario_id: number
          created_at?: string
          id?: number
          mentioned_user_id: number
        }
        Update: {
          comentario_id?: number
          created_at?: string
          id?: number
          mentioned_user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "comentario_menciones_comentario_id_fkey"
            columns: ["comentario_id"]
            isOneToOne: false
            referencedRelation: "comentarios_contexto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comentario_menciones_mentioned_user_id_fkey"
            columns: ["mentioned_user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comentario_menciones_mentioned_user_id_fkey"
            columns: ["mentioned_user_id"]
            isOneToOne: false
            referencedRelation: "v_notify_permission_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "comentario_menciones_mentioned_user_id_fkey"
            columns: ["mentioned_user_id"]
            isOneToOne: false
            referencedRelation: "v_osi_app_role_members"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      comentarios_contexto: {
        Row: {
          author_user_id: number
          comment_kind: string
          contenido: string
          context_id: number | null
          context_type: string | null
          created_at: string
          edited_at: string | null
          id: number
          is_system: boolean
          related_entities: Json
          related_entity_id: number | null
          related_entity_type: string | null
          related_service_id: number | null
          updated_at: string
          visibility_scope: string
        }
        Insert: {
          author_user_id: number
          comment_kind?: string
          contenido: string
          context_id?: number | null
          context_type?: string | null
          created_at?: string
          edited_at?: string | null
          id?: number
          is_system?: boolean
          related_entities?: Json
          related_entity_id?: number | null
          related_entity_type?: string | null
          related_service_id?: number | null
          updated_at?: string
          visibility_scope?: string
        }
        Update: {
          author_user_id?: number
          comment_kind?: string
          contenido?: string
          context_id?: number | null
          context_type?: string | null
          created_at?: string
          edited_at?: string | null
          id?: number
          is_system?: boolean
          related_entities?: Json
          related_entity_id?: number | null
          related_entity_type?: string | null
          related_service_id?: number | null
          updated_at?: string
          visibility_scope?: string
        }
        Relationships: [
          {
            foreignKeyName: "comentarios_contexto_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comentarios_contexto_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "v_notify_permission_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "comentarios_contexto_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "v_osi_app_role_members"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      competencias_facilitador: {
        Row: {
          id: number
          id_facilitador: number | null
          id_servicio: number | null
        }
        Insert: {
          id?: number
          id_facilitador?: number | null
          id_servicio?: number | null
        }
        Update: {
          id?: number
          id_facilitador?: number | null
          id_servicio?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "competencias_facilitador_id_facilitador_fkey"
            columns: ["id_facilitador"]
            isOneToOne: false
            referencedRelation: "facilitadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competencias_facilitador_id_servicio_fkey"
            columns: ["id_servicio"]
            isOneToOne: false
            referencedRelation: "catalogo_servicios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competencias_facilitador_id_servicio_fkey"
            columns: ["id_servicio"]
            isOneToOne: false
            referencedRelation: "v_osi_formato_completo"
            referencedColumns: ["id_servicio"]
          },
        ]
      }
      condiciones_ambientales: {
        Row: {
          humedad_equipo_adecuada: string | null
          humedad_lab_ideal: string | null
          id_equipo: number
          observaciones_ambientales: string | null
          temp_equipo_adecuada: string | null
          temp_lab_ideal: string | null
        }
        Insert: {
          humedad_equipo_adecuada?: string | null
          humedad_lab_ideal?: string | null
          id_equipo: number
          observaciones_ambientales?: string | null
          temp_equipo_adecuada?: string | null
          temp_lab_ideal?: string | null
        }
        Update: {
          humedad_equipo_adecuada?: string | null
          humedad_lab_ideal?: string | null
          id_equipo?: number
          observaciones_ambientales?: string | null
          temp_equipo_adecuada?: string | null
          temp_lab_ideal?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "condiciones_ambientales_id_equipo_fkey"
            columns: ["id_equipo"]
            isOneToOne: true
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
        ]
      }
      conf_clasificadores: {
        Row: {
          atributo_referencia: string
          definicion: string
          descripcion: string | null
          esta_activo: boolean | null
          id: number
          tabla_referencia: string
        }
        Insert: {
          atributo_referencia: string
          definicion: string
          descripcion?: string | null
          esta_activo?: boolean | null
          id?: number
          tabla_referencia: string
        }
        Update: {
          atributo_referencia?: string
          definicion?: string
          descripcion?: string | null
          esta_activo?: boolean | null
          id?: number
          tabla_referencia?: string
        }
        Relationships: []
      }
      conf_estatus: {
        Row: {
          atributo_referencia: string | null
          color_hex: string | null
          definicion: string | null
          descripcion: string | null
          es_estado_final: boolean | null
          id: number
          nombre_estado: string
          orden: number | null
          tabla_referencia: string
        }
        Insert: {
          atributo_referencia?: string | null
          color_hex?: string | null
          definicion?: string | null
          descripcion?: string | null
          es_estado_final?: boolean | null
          id?: number
          nombre_estado: string
          orden?: number | null
          tabla_referencia: string
        }
        Update: {
          atributo_referencia?: string | null
          color_hex?: string | null
          definicion?: string | null
          descripcion?: string | null
          es_estado_final?: boolean | null
          id?: number
          nombre_estado?: string
          orden?: number | null
          tabla_referencia?: string
        }
        Relationships: []
      }
      contactos: {
        Row: {
          apellido: string | null
          cargo: string | null
          cedula_rif_personal: string | null
          created_at: string
          direccion_personal: string | null
          email: string | null
          email2: string | null
          es_cliente: boolean
          es_decisor: boolean | null
          esta_activo: boolean | null
          fecha_creacion: string | null
          id: number
          id_ejecutivo_owner: number | null
          id_empresa: number | null
          id_estado_ubicacion: number | null
          id_estatus: number | null
          id_sede: number | null
          nombre: string
          status_changed_at: string | null
          telefono: string | null
          tipo_cliente: string | null
          updated_at: string
        }
        Insert: {
          apellido?: string | null
          cargo?: string | null
          cedula_rif_personal?: string | null
          created_at?: string
          direccion_personal?: string | null
          email?: string | null
          email2?: string | null
          es_cliente?: boolean
          es_decisor?: boolean | null
          esta_activo?: boolean | null
          fecha_creacion?: string | null
          id?: number
          id_ejecutivo_owner?: number | null
          id_empresa?: number | null
          id_estado_ubicacion?: number | null
          id_estatus?: number | null
          id_sede?: number | null
          nombre: string
          status_changed_at?: string | null
          telefono?: string | null
          tipo_cliente?: string | null
          updated_at?: string
        }
        Update: {
          apellido?: string | null
          cargo?: string | null
          cedula_rif_personal?: string | null
          created_at?: string
          direccion_personal?: string | null
          email?: string | null
          email2?: string | null
          es_cliente?: boolean
          es_decisor?: boolean | null
          esta_activo?: boolean | null
          fecha_creacion?: string | null
          id?: number
          id_ejecutivo_owner?: number | null
          id_empresa?: number | null
          id_estado_ubicacion?: number | null
          id_estatus?: number | null
          id_sede?: number | null
          nombre?: string
          status_changed_at?: string | null
          telefono?: string | null
          tipo_cliente?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contactos_id_ejecutivo_owner_fkey"
            columns: ["id_ejecutivo_owner"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contactos_id_ejecutivo_owner_fkey"
            columns: ["id_ejecutivo_owner"]
            isOneToOne: false
            referencedRelation: "v_notify_permission_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "contactos_id_ejecutivo_owner_fkey"
            columns: ["id_ejecutivo_owner"]
            isOneToOne: false
            referencedRelation: "v_osi_app_role_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "contactos_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contactos_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "v_osi_formato_completo"
            referencedColumns: ["id_empresa"]
          },
          {
            foreignKeyName: "contactos_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "v_osi_lista"
            referencedColumns: ["id_empresa"]
          },
          {
            foreignKeyName: "contactos_id_estado_ubicacion_fkey"
            columns: ["id_estado_ubicacion"]
            isOneToOne: false
            referencedRelation: "cat_estados_venezuela"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contactos_id_sede_fkey"
            columns: ["id_sede"]
            isOneToOne: false
            referencedRelation: "empresa_sedes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contactos_id_sede_fkey"
            columns: ["id_sede"]
            isOneToOne: false
            referencedRelation: "v_osi_formato_completo"
            referencedColumns: ["id_sede"]
          },
        ]
      }
      contactos_sedes: {
        Row: {
          fecha_asociacion: string
          id: number
          id_contacto: number
          id_sede: number
        }
        Insert: {
          fecha_asociacion?: string
          id?: number
          id_contacto: number
          id_sede: number
        }
        Update: {
          fecha_asociacion?: string
          id?: number
          id_contacto?: number
          id_sede?: number
        }
        Relationships: [
          {
            foreignKeyName: "contactos_sedes_id_contacto_fkey"
            columns: ["id_contacto"]
            isOneToOne: false
            referencedRelation: "contactos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contactos_sedes_id_sede_fkey"
            columns: ["id_sede"]
            isOneToOne: false
            referencedRelation: "empresa_sedes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contactos_sedes_id_sede_fkey"
            columns: ["id_sede"]
            isOneToOne: false
            referencedRelation: "v_osi_formato_completo"
            referencedColumns: ["id_sede"]
          },
        ]
      }
      control_sequences: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean
          notes: string | null
          nro_control: number
          nro_hoja: number
          nro_libro: number
          nro_linea: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          nro_control: number
          nro_hoja: number
          nro_libro: number
          nro_linea: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          nro_control?: number
          nro_hoja?: number
          nro_libro?: number
          nro_linea?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      control_servicios_ejecutados: {
        Row: {
          certificados_reales: number | null
          cod_cliente: number | null
          cod_facilitador: number | null
          costo_por_hora: number | null
          created_at: string | null
          created_by: number | null
          dias_traslado_t: number | null
          ejecutada_mes_curso: string | null
          facilitador: string | null
          fecha_ejecucion: string | null
          fecha_osi: string | null
          gasto_impresion_i: number | null
          horas_honorarios_h: number | null
          id: number
          id_osi: number | null
          indicador_facilitador: number | null
          mes_recepcion: string | null
          monto_x_traslado_mt: number | null
          nombre_curso: string | null
          numero_osi: string | null
          observaciones: string | null
          participante_x_osis: number | null
          participantes_asistidos: number | null
          pendiente_mes_anterior: string | null
          pvc_reales: number | null
          responsable: string | null
          updated_at: string | null
          updated_by: number | null
        }
        Insert: {
          certificados_reales?: number | null
          cod_cliente?: number | null
          cod_facilitador?: number | null
          costo_por_hora?: number | null
          created_at?: string | null
          created_by?: number | null
          dias_traslado_t?: number | null
          ejecutada_mes_curso?: string | null
          facilitador?: string | null
          fecha_ejecucion?: string | null
          fecha_osi?: string | null
          gasto_impresion_i?: number | null
          horas_honorarios_h?: number | null
          id?: number
          id_osi?: number | null
          indicador_facilitador?: number | null
          mes_recepcion?: string | null
          monto_x_traslado_mt?: number | null
          nombre_curso?: string | null
          numero_osi?: string | null
          observaciones?: string | null
          participante_x_osis?: number | null
          participantes_asistidos?: number | null
          pendiente_mes_anterior?: string | null
          pvc_reales?: number | null
          responsable?: string | null
          updated_at?: string | null
          updated_by?: number | null
        }
        Update: {
          certificados_reales?: number | null
          cod_cliente?: number | null
          cod_facilitador?: number | null
          costo_por_hora?: number | null
          created_at?: string | null
          created_by?: number | null
          dias_traslado_t?: number | null
          ejecutada_mes_curso?: string | null
          facilitador?: string | null
          fecha_ejecucion?: string | null
          fecha_osi?: string | null
          gasto_impresion_i?: number | null
          horas_honorarios_h?: number | null
          id?: number
          id_osi?: number | null
          indicador_facilitador?: number | null
          mes_recepcion?: string | null
          monto_x_traslado_mt?: number | null
          nombre_curso?: string | null
          numero_osi?: string | null
          observaciones?: string | null
          participante_x_osis?: number | null
          participantes_asistidos?: number | null
          pendiente_mes_anterior?: string | null
          pvc_reales?: number | null
          responsable?: string | null
          updated_at?: string | null
          updated_by?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "control_servicios_ejecutados_cod_facilitador_fkey"
            columns: ["cod_facilitador"]
            isOneToOne: false
            referencedRelation: "facilitadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "control_servicios_ejecutados_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "control_servicios_ejecutados_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_notify_permission_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "control_servicios_ejecutados_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_osi_app_role_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "control_servicios_ejecutados_id_osi_fkey"
            columns: ["id_osi"]
            isOneToOne: false
            referencedRelation: "ejecucion_osi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "control_servicios_ejecutados_id_osi_fkey"
            columns: ["id_osi"]
            isOneToOne: false
            referencedRelation: "v_osi_formato_completo"
            referencedColumns: ["id_osi"]
          },
          {
            foreignKeyName: "control_servicios_ejecutados_id_osi_fkey"
            columns: ["id_osi"]
            isOneToOne: false
            referencedRelation: "v_osi_lista"
            referencedColumns: ["id_osi"]
          },
          {
            foreignKeyName: "control_servicios_ejecutados_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "control_servicios_ejecutados_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "v_notify_permission_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "control_servicios_ejecutados_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "v_osi_app_role_members"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      course_satisfaction_surveys: {
        Row: {
          attendance_reasons: Json
          created_at: string | null
          id: string
          id_osi: number
          nro_sesion: number
          q1: number
          q10: number
          q2: number
          q3: number
          q4: number
          q5: number
          q6: number
          q7: number
          q8: number
          q9: number
        }
        Insert: {
          attendance_reasons?: Json
          created_at?: string | null
          id?: string
          id_osi: number
          nro_sesion?: number
          q1: number
          q10: number
          q2: number
          q3: number
          q4: number
          q5: number
          q6: number
          q7: number
          q8: number
          q9: number
        }
        Update: {
          attendance_reasons?: Json
          created_at?: string | null
          id?: string
          id_osi?: number
          nro_sesion?: number
          q1?: number
          q10?: number
          q2?: number
          q3?: number
          q4?: number
          q5?: number
          q6?: number
          q7?: number
          q8?: number
          q9?: number
        }
        Relationships: [
          {
            foreignKeyName: "course_satisfaction_surveys_id_osi_fkey"
            columns: ["id_osi"]
            isOneToOne: false
            referencedRelation: "ejecucion_osi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_satisfaction_surveys_id_osi_fkey"
            columns: ["id_osi"]
            isOneToOne: false
            referencedRelation: "v_osi_formato_completo"
            referencedColumns: ["id_osi"]
          },
          {
            foreignKeyName: "course_satisfaction_surveys_id_osi_fkey"
            columns: ["id_osi"]
            isOneToOne: false
            referencedRelation: "v_osi_lista"
            referencedColumns: ["id_osi"]
          },
        ]
      }
      crm_eventos_importantes: {
        Row: {
          actor_user_id: number | null
          created_at: string
          empresa_id: number | null
          id: number
          id_registro_principal: number
          payload: Json
          tabla_principal: string
          tipo_evento: string
        }
        Insert: {
          actor_user_id?: number | null
          created_at?: string
          empresa_id?: number | null
          id?: number
          id_registro_principal: number
          payload?: Json
          tabla_principal: string
          tipo_evento: string
        }
        Update: {
          actor_user_id?: number | null
          created_at?: string
          empresa_id?: number | null
          id?: number
          id_registro_principal?: number
          payload?: Json
          tabla_principal?: string
          tipo_evento?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_eventos_importantes_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_eventos_importantes_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "v_notify_permission_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "crm_eventos_importantes_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "v_osi_app_role_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "crm_eventos_importantes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_eventos_importantes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_osi_formato_completo"
            referencedColumns: ["id_empresa"]
          },
          {
            foreignKeyName: "crm_eventos_importantes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_osi_lista"
            referencedColumns: ["id_empresa"]
          },
        ]
      }
      cursos: {
        Row: {
          contenido: string | null
          created_at: string | null
          emite_carnet: boolean | null
          horas_estimadas: number | null
          id: number
          is_active: boolean
          nombre: string
          nota_aprobatoria: number | null
        }
        Insert: {
          contenido?: string | null
          created_at?: string | null
          emite_carnet?: boolean | null
          horas_estimadas?: number | null
          id?: number
          is_active?: boolean
          nombre: string
          nota_aprobatoria?: number | null
        }
        Update: {
          contenido?: string | null
          created_at?: string | null
          emite_carnet?: boolean | null
          horas_estimadas?: number | null
          id?: number
          is_active?: boolean
          nombre?: string
          nota_aprobatoria?: number | null
        }
        Relationships: []
      }
      dashboard_cierre_config: {
        Row: {
          activo: boolean
          created_at: string
          dia_cierre_semanal: number
          factor_meta_presupuesto: number
          factor_meta_venta: number
          freeze_app_base_url: string | null
          freeze_cron_secret: string | null
          hora_cierre_anual: string
          hora_cierre_mensual: string
          hora_cierre_semanal: string
          hora_cierre_semestral: string
          hora_cierre_trimestral: string
          id: number
          porcentaje_aprobacion_meta: number
          proyeccion_alcance_periodo: string
          proyeccion_max_reproyecciones: number
          proyeccion_vigencia_periodo: string
          updated_at: string
          zona_horaria: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          dia_cierre_semanal?: number
          factor_meta_presupuesto?: number
          factor_meta_venta?: number
          freeze_app_base_url?: string | null
          freeze_cron_secret?: string | null
          hora_cierre_anual?: string
          hora_cierre_mensual?: string
          hora_cierre_semanal?: string
          hora_cierre_semestral?: string
          hora_cierre_trimestral?: string
          id?: number
          porcentaje_aprobacion_meta?: number
          proyeccion_alcance_periodo?: string
          proyeccion_max_reproyecciones?: number
          proyeccion_vigencia_periodo?: string
          updated_at?: string
          zona_horaria?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          dia_cierre_semanal?: number
          factor_meta_presupuesto?: number
          factor_meta_venta?: number
          freeze_app_base_url?: string | null
          freeze_cron_secret?: string | null
          hora_cierre_anual?: string
          hora_cierre_mensual?: string
          hora_cierre_semanal?: string
          hora_cierre_semestral?: string
          hora_cierre_trimestral?: string
          id?: number
          porcentaje_aprobacion_meta?: number
          proyeccion_alcance_periodo?: string
          proyeccion_max_reproyecciones?: number
          proyeccion_vigencia_periodo?: string
          updated_at?: string
          zona_horaria?: string
        }
        Relationships: []
      }
      dashboard_cierres_log: {
        Row: {
          accion: string
          detalle: string | null
          ejecutado_at: string
          ejecutado_por: number | null
          id: number
          periodo_id: number
          version: number
        }
        Insert: {
          accion: string
          detalle?: string | null
          ejecutado_at?: string
          ejecutado_por?: number | null
          id?: number
          periodo_id: number
          version?: number
        }
        Update: {
          accion?: string
          detalle?: string | null
          ejecutado_at?: string
          ejecutado_por?: number | null
          id?: number
          periodo_id?: number
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_cierres_log_periodo_id_fkey"
            columns: ["periodo_id"]
            isOneToOne: false
            referencedRelation: "dashboard_periodos"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_metas_auditoria: {
        Row: {
          anio_mes: string
          changed_at: string
          changed_by: number | null
          id: number
          payload_after: Json
          payload_before: Json | null
        }
        Insert: {
          anio_mes: string
          changed_at?: string
          changed_by?: number | null
          id?: number
          payload_after: Json
          payload_before?: Json | null
        }
        Update: {
          anio_mes?: string
          changed_at?: string
          changed_by?: number | null
          id?: number
          payload_after?: Json
          payload_before?: Json | null
        }
        Relationships: []
      }
      dashboard_metas_ejecutivo_mensual: {
        Row: {
          anio_mes: string
          ejecutivo_id: number
          porcentaje_meta: number
          updated_at: string
          updated_by: number | null
        }
        Insert: {
          anio_mes: string
          ejecutivo_id: number
          porcentaje_meta: number
          updated_at?: string
          updated_by?: number | null
        }
        Update: {
          anio_mes?: string
          ejecutivo_id?: number
          porcentaje_meta?: number
          updated_at?: string
          updated_by?: number | null
        }
        Relationships: []
      }
      dashboard_metas_mensual: {
        Row: {
          anio_mes: string
          dias_habiles_mes: number
          factor_meta_presupuesto: number
          factor_meta_venta: number
          meta_presupuesto_mensual: number
          meta_presupuesto_override: boolean
          meta_venta_mensual: number
          meta_venta_override: boolean
          porcentaje_aprobacion_meta: number
          presupuesto_empresa_mensual: number
          updated_at: string
          updated_by: number | null
        }
        Insert: {
          anio_mes: string
          dias_habiles_mes?: number
          factor_meta_presupuesto?: number
          factor_meta_venta?: number
          meta_presupuesto_mensual?: number
          meta_presupuesto_override?: boolean
          meta_venta_mensual?: number
          meta_venta_override?: boolean
          porcentaje_aprobacion_meta?: number
          presupuesto_empresa_mensual?: number
          updated_at?: string
          updated_by?: number | null
        }
        Update: {
          anio_mes?: string
          dias_habiles_mes?: number
          factor_meta_presupuesto?: number
          factor_meta_venta?: number
          meta_presupuesto_mensual?: number
          meta_presupuesto_override?: boolean
          meta_venta_mensual?: number
          meta_venta_override?: boolean
          porcentaje_aprobacion_meta?: number
          presupuesto_empresa_mensual?: number
          updated_at?: string
          updated_by?: number | null
        }
        Relationships: []
      }
      dashboard_periodos: {
        Row: {
          cerrado_at: string | null
          cerrado_por: number | null
          cierre_programado_activo: boolean
          created_at: string
          es_canonico: boolean
          estado: string
          etiqueta: string
          fecha_fin: string
          fecha_fin_programada: string
          fecha_inicio: string
          id: number
          snapshot_frozen_at: string | null
          tipo: string
          updated_at: string
          version: number
        }
        Insert: {
          cerrado_at?: string | null
          cerrado_por?: number | null
          cierre_programado_activo?: boolean
          created_at?: string
          es_canonico?: boolean
          estado?: string
          etiqueta: string
          fecha_fin: string
          fecha_fin_programada: string
          fecha_inicio: string
          id?: number
          snapshot_frozen_at?: string | null
          tipo: string
          updated_at?: string
          version?: number
        }
        Update: {
          cerrado_at?: string | null
          cerrado_por?: number | null
          cierre_programado_activo?: boolean
          created_at?: string
          es_canonico?: boolean
          estado?: string
          etiqueta?: string
          fecha_fin?: string
          fecha_fin_programada?: string
          fecha_inicio?: string
          id?: number
          snapshot_frozen_at?: string | null
          tipo?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      dashboard_snapshot_ejecutivo: {
        Row: {
          aprobacion_pct: number
          aprobado: number
          cantidad_aprobado: number
          cantidad_presupuestado: number
          cumplimiento_pct: number
          ejecutivo_id: number
          ejecutivo_nombre: string
          meta_presupuesto: number
          payload_json: Json
          periodo_id: number
          porcentaje_meta: number
          ranking_cumplimiento: number | null
          real_presupuestado: number
        }
        Insert: {
          aprobacion_pct?: number
          aprobado?: number
          cantidad_aprobado?: number
          cantidad_presupuestado?: number
          cumplimiento_pct?: number
          ejecutivo_id: number
          ejecutivo_nombre: string
          meta_presupuesto?: number
          payload_json?: Json
          periodo_id: number
          porcentaje_meta?: number
          ranking_cumplimiento?: number | null
          real_presupuestado?: number
        }
        Update: {
          aprobacion_pct?: number
          aprobado?: number
          cantidad_aprobado?: number
          cantidad_presupuestado?: number
          cumplimiento_pct?: number
          ejecutivo_id?: number
          ejecutivo_nombre?: string
          meta_presupuesto?: number
          payload_json?: Json
          periodo_id?: number
          porcentaje_meta?: number
          ranking_cumplimiento?: number | null
          real_presupuestado?: number
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_snapshot_ejecutivo_periodo_id_fkey"
            columns: ["periodo_id"]
            isOneToOne: false
            referencedRelation: "dashboard_periodos"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_snapshot_global: {
        Row: {
          aprobacion_pct: number
          aprobado: number
          brecha: number
          cantidad_aprobado: number
          cantidad_meta: number
          cantidad_presupuestado: number
          cerrado_at: string
          cerrado_por: number | null
          cumplimiento_pct: number
          meta_presupuesto: number
          meta_presupuesto_diaria: number
          payload_json: Json
          periodo_id: number
          real_presupuestado: number
        }
        Insert: {
          aprobacion_pct?: number
          aprobado?: number
          brecha?: number
          cantidad_aprobado?: number
          cantidad_meta?: number
          cantidad_presupuestado?: number
          cerrado_at?: string
          cerrado_por?: number | null
          cumplimiento_pct?: number
          meta_presupuesto?: number
          meta_presupuesto_diaria?: number
          payload_json?: Json
          periodo_id: number
          real_presupuestado?: number
        }
        Update: {
          aprobacion_pct?: number
          aprobado?: number
          brecha?: number
          cantidad_aprobado?: number
          cantidad_meta?: number
          cantidad_presupuestado?: number
          cerrado_at?: string
          cerrado_por?: number | null
          cumplimiento_pct?: number
          meta_presupuesto?: number
          meta_presupuesto_diaria?: number
          payload_json?: Json
          periodo_id?: number
          real_presupuestado?: number
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_snapshot_global_periodo_id_fkey"
            columns: ["periodo_id"]
            isOneToOne: true
            referencedRelation: "dashboard_periodos"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_snapshot_series: {
        Row: {
          aprobacion_acum: number
          cantidad_aprobados_acum: number
          cantidad_presupuestos_validos_acum: number
          cantidad_ventas_acum: number
          ejecutivo_id: number
          fecha_fin_bucket: string
          label: string
          meta_presupuesto_acum: number
          meta_venta_acum: number
          monto_aprobado_acum: number
          monto_presupuestado_acum: number
          monto_venta_acum: number
          periodo_id: number
          scope: string
        }
        Insert: {
          aprobacion_acum?: number
          cantidad_aprobados_acum?: number
          cantidad_presupuestos_validos_acum?: number
          cantidad_ventas_acum?: number
          ejecutivo_id?: number
          fecha_fin_bucket: string
          label: string
          meta_presupuesto_acum?: number
          meta_venta_acum?: number
          monto_aprobado_acum?: number
          monto_presupuestado_acum?: number
          monto_venta_acum?: number
          periodo_id: number
          scope: string
        }
        Update: {
          aprobacion_acum?: number
          cantidad_aprobados_acum?: number
          cantidad_presupuestos_validos_acum?: number
          cantidad_ventas_acum?: number
          ejecutivo_id?: number
          fecha_fin_bucket?: string
          label?: string
          meta_presupuesto_acum?: number
          meta_venta_acum?: number
          monto_aprobado_acum?: number
          monto_presupuestado_acum?: number
          monto_venta_acum?: number
          periodo_id?: number
          scope?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_snapshot_series_periodo_id_fkey"
            columns: ["periodo_id"]
            isOneToOne: false
            referencedRelation: "dashboard_periodos"
            referencedColumns: ["id"]
          },
        ]
      }
      datos_bancarios: {
        Row: {
          banco: string
          cedula_titular: string | null
          es_principal: boolean | null
          id: number
          id_empleado: number | null
          id_empresa: number | null
          id_facilitador: number | null
          id_proveedor: number | null
          nombre_titular: string | null
          nro_cuenta: string
          telefono_pago_movil: string | null
          tipo_cuenta: string | null
        }
        Insert: {
          banco: string
          cedula_titular?: string | null
          es_principal?: boolean | null
          id?: number
          id_empleado?: number | null
          id_empresa?: number | null
          id_facilitador?: number | null
          id_proveedor?: number | null
          nombre_titular?: string | null
          nro_cuenta: string
          telefono_pago_movil?: string | null
          tipo_cuenta?: string | null
        }
        Update: {
          banco?: string
          cedula_titular?: string | null
          es_principal?: boolean | null
          id?: number
          id_empleado?: number | null
          id_empresa?: number | null
          id_facilitador?: number | null
          id_proveedor?: number | null
          nombre_titular?: string | null
          nro_cuenta?: string
          telefono_pago_movil?: string | null
          tipo_cuenta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "datos_bancarios_id_empleado_fkey"
            columns: ["id_empleado"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "datos_bancarios_id_empleado_fkey"
            columns: ["id_empleado"]
            isOneToOne: false
            referencedRelation: "v_notify_permission_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "datos_bancarios_id_empleado_fkey"
            columns: ["id_empleado"]
            isOneToOne: false
            referencedRelation: "v_osi_app_role_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "datos_bancarios_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "datos_bancarios_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "v_osi_formato_completo"
            referencedColumns: ["id_empresa"]
          },
          {
            foreignKeyName: "datos_bancarios_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "v_osi_lista"
            referencedColumns: ["id_empresa"]
          },
          {
            foreignKeyName: "datos_bancarios_id_facilitador_fkey"
            columns: ["id_facilitador"]
            isOneToOne: false
            referencedRelation: "facilitadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "datos_bancarios_id_proveedor_fkey"
            columns: ["id_proveedor"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
        ]
      }
      departamentos: {
        Row: {
          coordinador: number | null
          descripcion: string | null
          esta_activo: boolean | null
          gerencia: string | null
          id: number
          nombre: string
        }
        Insert: {
          coordinador?: number | null
          descripcion?: string | null
          esta_activo?: boolean | null
          gerencia?: string | null
          id?: number
          nombre: string
        }
        Update: {
          coordinador?: number | null
          descripcion?: string | null
          esta_activo?: boolean | null
          gerencia?: string | null
          id?: number
          nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "departamentos_coordinador_fkey"
            columns: ["coordinador"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departamentos_coordinador_fkey"
            columns: ["coordinador"]
            isOneToOne: false
            referencedRelation: "v_notify_permission_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "departamentos_coordinador_fkey"
            columns: ["coordinador"]
            isOneToOne: false
            referencedRelation: "v_osi_app_role_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "departamentos_gerencia_fkey"
            columns: ["gerencia"]
            isOneToOne: false
            referencedRelation: "gerencias"
            referencedColumns: ["nombre"]
          },
        ]
      }
      direcciones_cliente: {
        Row: {
          direccion_exacta: string
          esta_activo: boolean
          id: number
          id_ciudad: number | null
          id_empresa: number
          id_estado: number | null
          id_sede: number | null
          nombre_etiqueta: string | null
        }
        Insert: {
          direccion_exacta: string
          esta_activo?: boolean
          id?: number
          id_ciudad?: number | null
          id_empresa: number
          id_estado?: number | null
          id_sede?: number | null
          nombre_etiqueta?: string | null
        }
        Update: {
          direccion_exacta?: string
          esta_activo?: boolean
          id?: number
          id_ciudad?: number | null
          id_empresa?: number
          id_estado?: number | null
          id_sede?: number | null
          nombre_etiqueta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "direcciones_cliente_id_ciudad_fkey"
            columns: ["id_ciudad"]
            isOneToOne: false
            referencedRelation: "cat_ciudades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direcciones_cliente_id_estado_fkey"
            columns: ["id_estado"]
            isOneToOne: false
            referencedRelation: "cat_estados_venezuela"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direcciones_cliente_id_sede_fkey"
            columns: ["id_sede"]
            isOneToOne: false
            referencedRelation: "empresa_sedes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direcciones_cliente_id_sede_fkey"
            columns: ["id_sede"]
            isOneToOne: false
            referencedRelation: "v_osi_formato_completo"
            referencedColumns: ["id_sede"]
          },
          {
            foreignKeyName: "fk_direcciones_empresa"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_direcciones_empresa"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "v_osi_formato_completo"
            referencedColumns: ["id_empresa"]
          },
          {
            foreignKeyName: "fk_direcciones_empresa"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "v_osi_lista"
            referencedColumns: ["id_empresa"]
          },
        ]
      }
      ecc_catalogo_costos: {
        Row: {
          ambito_catalogo: string
          costo_unitario_base: number | null
          esta_activo: boolean | null
          id: number
          id_categoria: number | null
          id_tipo_calculo: number | null
          id_unidad: number | null
          mapeo_recurso_osi: string | null
          nombre_item: string
        }
        Insert: {
          ambito_catalogo?: string
          costo_unitario_base?: number | null
          esta_activo?: boolean | null
          id?: number
          id_categoria?: number | null
          id_tipo_calculo?: number | null
          id_unidad?: number | null
          mapeo_recurso_osi?: string | null
          nombre_item: string
        }
        Update: {
          ambito_catalogo?: string
          costo_unitario_base?: number | null
          esta_activo?: boolean | null
          id?: number
          id_categoria?: number | null
          id_tipo_calculo?: number | null
          id_unidad?: number | null
          mapeo_recurso_osi?: string | null
          nombre_item?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_cat_costos_calculo"
            columns: ["id_tipo_calculo"]
            isOneToOne: false
            referencedRelation: "conf_clasificadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_cat_costos_categoria"
            columns: ["id_categoria"]
            isOneToOne: false
            referencedRelation: "conf_clasificadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_cat_costos_unidad"
            columns: ["id_unidad"]
            isOneToOne: false
            referencedRelation: "conf_clasificadores"
            referencedColumns: ["id"]
          },
        ]
      }
      ecc_config_margenes: {
        Row: {
          esta_activo: boolean | null
          id: number
          id_tipo_calculo: number | null
          nombre_margen: string | null
          porcentaje: number | null
        }
        Insert: {
          esta_activo?: boolean | null
          id?: number
          id_tipo_calculo?: number | null
          nombre_margen?: string | null
          porcentaje?: number | null
        }
        Update: {
          esta_activo?: boolean | null
          id?: number
          id_tipo_calculo?: number | null
          nombre_margen?: string | null
          porcentaje?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_margenes_tipo_calculo"
            columns: ["id_tipo_calculo"]
            isOneToOne: false
            referencedRelation: "conf_clasificadores"
            referencedColumns: ["id"]
          },
        ]
      }
      ecc_detalle_lineas: {
        Row: {
          aplica: boolean | null
          cantidad: number | null
          concepto_linea: string | null
          costo_aplicado: number | null
          id: number
          id_categoria_manual: number | null
          id_ecc: number | null
          id_item_costo: number | null
          id_tipo_calculo_manual: number | null
          porcentaje_sobre_total: number | null
          precio_aplicado: number | null
          subtotal_costo: number | null
        }
        Insert: {
          aplica?: boolean | null
          cantidad?: number | null
          concepto_linea?: string | null
          costo_aplicado?: number | null
          id?: number
          id_categoria_manual?: number | null
          id_ecc?: number | null
          id_item_costo?: number | null
          id_tipo_calculo_manual?: number | null
          porcentaje_sobre_total?: number | null
          precio_aplicado?: number | null
          subtotal_costo?: number | null
        }
        Update: {
          aplica?: boolean | null
          cantidad?: number | null
          concepto_linea?: string | null
          costo_aplicado?: number | null
          id?: number
          id_categoria_manual?: number | null
          id_ecc?: number | null
          id_item_costo?: number | null
          id_tipo_calculo_manual?: number | null
          porcentaje_sobre_total?: number | null
          precio_aplicado?: number | null
          subtotal_costo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ecc_detalle_lineas_categoria_manual_fkey"
            columns: ["id_categoria_manual"]
            isOneToOne: false
            referencedRelation: "conf_clasificadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecc_detalle_lineas_id_ecc_fkey"
            columns: ["id_ecc"]
            isOneToOne: false
            referencedRelation: "ecc_encabezado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecc_detalle_lineas_id_ecc_fkey"
            columns: ["id_ecc"]
            isOneToOne: false
            referencedRelation: "v_ecc_preview_context"
            referencedColumns: ["ecc_id"]
          },
          {
            foreignKeyName: "ecc_detalle_lineas_id_ecc_fkey"
            columns: ["id_ecc"]
            isOneToOne: false
            referencedRelation: "v_ecc_resumen"
            referencedColumns: ["id_ecc"]
          },
          {
            foreignKeyName: "ecc_detalle_lineas_id_ecc_fkey"
            columns: ["id_ecc"]
            isOneToOne: false
            referencedRelation: "v_funnel_comercial_detallado"
            referencedColumns: ["ecc_id"]
          },
          {
            foreignKeyName: "ecc_detalle_lineas_id_item_costo_fkey"
            columns: ["id_item_costo"]
            isOneToOne: false
            referencedRelation: "ecc_catalogo_costos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecc_detalle_lineas_tipo_calculo_manual_fkey"
            columns: ["id_tipo_calculo_manual"]
            isOneToOne: false
            referencedRelation: "conf_clasificadores"
            referencedColumns: ["id"]
          },
        ]
      }
      ecc_distribucion_servicios: {
        Row: {
          cantidad_puntos_item: number
          costo_proporcional_unitario: number | null
          created_at: string
          id: number
          id_ecc: number
          id_servicio: number
          porcentaje_peso: number
          total_proporcional_servicio: number | null
          updated_at: string
        }
        Insert: {
          cantidad_puntos_item?: number
          costo_proporcional_unitario?: number | null
          created_at?: string
          id?: number
          id_ecc: number
          id_servicio: number
          porcentaje_peso: number
          total_proporcional_servicio?: number | null
          updated_at?: string
        }
        Update: {
          cantidad_puntos_item?: number
          costo_proporcional_unitario?: number | null
          created_at?: string
          id?: number
          id_ecc?: number
          id_servicio?: number
          porcentaje_peso?: number
          total_proporcional_servicio?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ecc_distribucion_servicios_id_ecc_fkey"
            columns: ["id_ecc"]
            isOneToOne: false
            referencedRelation: "ecc_encabezado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecc_distribucion_servicios_id_ecc_fkey"
            columns: ["id_ecc"]
            isOneToOne: false
            referencedRelation: "v_ecc_preview_context"
            referencedColumns: ["ecc_id"]
          },
          {
            foreignKeyName: "ecc_distribucion_servicios_id_ecc_fkey"
            columns: ["id_ecc"]
            isOneToOne: false
            referencedRelation: "v_ecc_resumen"
            referencedColumns: ["id_ecc"]
          },
          {
            foreignKeyName: "ecc_distribucion_servicios_id_ecc_fkey"
            columns: ["id_ecc"]
            isOneToOne: false
            referencedRelation: "v_funnel_comercial_detallado"
            referencedColumns: ["ecc_id"]
          },
          {
            foreignKeyName: "ecc_distribucion_servicios_id_servicio_fkey"
            columns: ["id_servicio"]
            isOneToOne: false
            referencedRelation: "catalogo_servicios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecc_distribucion_servicios_id_servicio_fkey"
            columns: ["id_servicio"]
            isOneToOne: false
            referencedRelation: "v_osi_formato_completo"
            referencedColumns: ["id_servicio"]
          },
        ]
      }
      ecc_encabezado: {
        Row: {
          audiovisuales: boolean | null
          cantidad_analistas: number | null
          cantidad_dias_campo: number | null
          cantidad_dias_habiles: number | null
          cantidad_dias_informe: number | null
          cantidad_dias_revision_interna: number | null
          cantidad_dias_total: number | null
          cantidad_dias_total_proyecto: number | null
          clase_ecc: string
          created_at: string
          espacio: boolean
          fecha_aprobacion: string | null
          fecha_ejecucion_servicio: string | null
          fecha_solicitud: string | null
          horas_totales: number | null
          id: number
          id_direccion_ejecucion_solped: number | null
          id_direccion_envio_solped: number | null
          id_ecc_consolidada: number | null
          id_ecc_origen_clon: number | null
          id_estatus: number | null
          id_modalidad: number | null
          id_presupuesto_aprobado: number | null
          id_servicio: number | null
          id_trato: number | null
          id_usuario_revision_financiera: number | null
          motivo_rechazo: string | null
          nro_ecc: number | null
          nro_solped: number | null
          numero_areas: number | null
          numero_puntos_evaluar: number | null
          numero_trabajadores: number | null
          observaciones_cliente: string | null
          participantes: number | null
          pretenciones_cliente: string | null
          sesiones: number | null
          status_changed_at: string | null
          updated_at: string
        }
        Insert: {
          audiovisuales?: boolean | null
          cantidad_analistas?: number | null
          cantidad_dias_campo?: number | null
          cantidad_dias_habiles?: number | null
          cantidad_dias_informe?: number | null
          cantidad_dias_revision_interna?: number | null
          cantidad_dias_total?: number | null
          cantidad_dias_total_proyecto?: number | null
          clase_ecc?: string
          created_at?: string
          espacio?: boolean
          fecha_aprobacion?: string | null
          fecha_ejecucion_servicio?: string | null
          fecha_solicitud?: string | null
          horas_totales?: number | null
          id?: number
          id_direccion_ejecucion_solped?: number | null
          id_direccion_envio_solped?: number | null
          id_ecc_consolidada?: number | null
          id_ecc_origen_clon?: number | null
          id_estatus?: number | null
          id_modalidad?: number | null
          id_presupuesto_aprobado?: number | null
          id_servicio?: number | null
          id_trato?: number | null
          id_usuario_revision_financiera?: number | null
          motivo_rechazo?: string | null
          nro_ecc?: number | null
          nro_solped?: number | null
          numero_areas?: number | null
          numero_puntos_evaluar?: number | null
          numero_trabajadores?: number | null
          observaciones_cliente?: string | null
          participantes?: number | null
          pretenciones_cliente?: string | null
          sesiones?: number | null
          status_changed_at?: string | null
          updated_at?: string
        }
        Update: {
          audiovisuales?: boolean | null
          cantidad_analistas?: number | null
          cantidad_dias_campo?: number | null
          cantidad_dias_habiles?: number | null
          cantidad_dias_informe?: number | null
          cantidad_dias_revision_interna?: number | null
          cantidad_dias_total?: number | null
          cantidad_dias_total_proyecto?: number | null
          clase_ecc?: string
          created_at?: string
          espacio?: boolean
          fecha_aprobacion?: string | null
          fecha_ejecucion_servicio?: string | null
          fecha_solicitud?: string | null
          horas_totales?: number | null
          id?: number
          id_direccion_ejecucion_solped?: number | null
          id_direccion_envio_solped?: number | null
          id_ecc_consolidada?: number | null
          id_ecc_origen_clon?: number | null
          id_estatus?: number | null
          id_modalidad?: number | null
          id_presupuesto_aprobado?: number | null
          id_servicio?: number | null
          id_trato?: number | null
          id_usuario_revision_financiera?: number | null
          motivo_rechazo?: string | null
          nro_ecc?: number | null
          nro_solped?: number | null
          numero_areas?: number | null
          numero_puntos_evaluar?: number | null
          numero_trabajadores?: number | null
          observaciones_cliente?: string | null
          participantes?: number | null
          pretenciones_cliente?: string | null
          sesiones?: number | null
          status_changed_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ecc_encabezado_id_direccion_ejecucion_solped_fkey"
            columns: ["id_direccion_ejecucion_solped"]
            isOneToOne: false
            referencedRelation: "direcciones_cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecc_encabezado_id_direccion_envio_solped_fkey"
            columns: ["id_direccion_envio_solped"]
            isOneToOne: false
            referencedRelation: "direcciones_cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecc_encabezado_id_ecc_consolidada_fkey"
            columns: ["id_ecc_consolidada"]
            isOneToOne: false
            referencedRelation: "ecc_encabezado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecc_encabezado_id_ecc_consolidada_fkey"
            columns: ["id_ecc_consolidada"]
            isOneToOne: false
            referencedRelation: "v_ecc_preview_context"
            referencedColumns: ["ecc_id"]
          },
          {
            foreignKeyName: "ecc_encabezado_id_ecc_consolidada_fkey"
            columns: ["id_ecc_consolidada"]
            isOneToOne: false
            referencedRelation: "v_ecc_resumen"
            referencedColumns: ["id_ecc"]
          },
          {
            foreignKeyName: "ecc_encabezado_id_ecc_consolidada_fkey"
            columns: ["id_ecc_consolidada"]
            isOneToOne: false
            referencedRelation: "v_funnel_comercial_detallado"
            referencedColumns: ["ecc_id"]
          },
          {
            foreignKeyName: "ecc_encabezado_id_ecc_origen_clon_fkey"
            columns: ["id_ecc_origen_clon"]
            isOneToOne: false
            referencedRelation: "ecc_encabezado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecc_encabezado_id_ecc_origen_clon_fkey"
            columns: ["id_ecc_origen_clon"]
            isOneToOne: false
            referencedRelation: "v_ecc_preview_context"
            referencedColumns: ["ecc_id"]
          },
          {
            foreignKeyName: "ecc_encabezado_id_ecc_origen_clon_fkey"
            columns: ["id_ecc_origen_clon"]
            isOneToOne: false
            referencedRelation: "v_ecc_resumen"
            referencedColumns: ["id_ecc"]
          },
          {
            foreignKeyName: "ecc_encabezado_id_ecc_origen_clon_fkey"
            columns: ["id_ecc_origen_clon"]
            isOneToOne: false
            referencedRelation: "v_funnel_comercial_detallado"
            referencedColumns: ["ecc_id"]
          },
          {
            foreignKeyName: "ecc_encabezado_id_estatus_fkey"
            columns: ["id_estatus"]
            isOneToOne: false
            referencedRelation: "conf_estatus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecc_encabezado_id_modalidad_fkey"
            columns: ["id_modalidad"]
            isOneToOne: false
            referencedRelation: "modalidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecc_encabezado_id_presupuesto_aprobado_fkey"
            columns: ["id_presupuesto_aprobado"]
            isOneToOne: false
            referencedRelation: "presupuestos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecc_encabezado_id_servicio_fkey"
            columns: ["id_servicio"]
            isOneToOne: false
            referencedRelation: "catalogo_servicios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecc_encabezado_id_servicio_fkey"
            columns: ["id_servicio"]
            isOneToOne: false
            referencedRelation: "v_osi_formato_completo"
            referencedColumns: ["id_servicio"]
          },
          {
            foreignKeyName: "ecc_encabezado_id_trato_fkey"
            columns: ["id_trato"]
            isOneToOne: false
            referencedRelation: "tratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecc_encabezado_id_trato_fkey"
            columns: ["id_trato"]
            isOneToOne: false
            referencedRelation: "v_ecc_preview_context"
            referencedColumns: ["trato_table_id"]
          },
          {
            foreignKeyName: "ecc_encabezado_id_trato_fkey"
            columns: ["id_trato"]
            isOneToOne: false
            referencedRelation: "v_funnel_comercial_detallado"
            referencedColumns: ["trato_id"]
          },
          {
            foreignKeyName: "ecc_encabezado_id_usuario_revision_financiera_fkey"
            columns: ["id_usuario_revision_financiera"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecc_encabezado_id_usuario_revision_financiera_fkey"
            columns: ["id_usuario_revision_financiera"]
            isOneToOne: false
            referencedRelation: "v_notify_permission_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "ecc_encabezado_id_usuario_revision_financiera_fkey"
            columns: ["id_usuario_revision_financiera"]
            isOneToOne: false
            referencedRelation: "v_osi_app_role_members"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      ecc_totales: {
        Row: {
          admin_costo_hora_aplicado: number | null
          admin_factor_aplicado: number | null
          admin_horas_aplicadas: number | null
          admin_meta_global_aplicada: number | null
          id: number
          id_ecc: number
          margenes_aplicados: Json
          monto_gastos_admin: number | null
          monto_impuestos: number | null
          monto_iva: number | null
          monto_utilidad: number | null
          precio_por_persona: number | null
          redondear_total_entero: boolean
          subtotal_costos_directos: number | null
          total_general: number | null
        }
        Insert: {
          admin_costo_hora_aplicado?: number | null
          admin_factor_aplicado?: number | null
          admin_horas_aplicadas?: number | null
          admin_meta_global_aplicada?: number | null
          id?: number
          id_ecc: number
          margenes_aplicados?: Json
          monto_gastos_admin?: number | null
          monto_impuestos?: number | null
          monto_iva?: number | null
          monto_utilidad?: number | null
          precio_por_persona?: number | null
          redondear_total_entero?: boolean
          subtotal_costos_directos?: number | null
          total_general?: number | null
        }
        Update: {
          admin_costo_hora_aplicado?: number | null
          admin_factor_aplicado?: number | null
          admin_horas_aplicadas?: number | null
          admin_meta_global_aplicada?: number | null
          id?: number
          id_ecc?: number
          margenes_aplicados?: Json
          monto_gastos_admin?: number | null
          monto_impuestos?: number | null
          monto_iva?: number | null
          monto_utilidad?: number | null
          precio_por_persona?: number | null
          redondear_total_entero?: boolean
          subtotal_costos_directos?: number | null
          total_general?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ecc_totales_id_ecc_fkey"
            columns: ["id_ecc"]
            isOneToOne: true
            referencedRelation: "ecc_encabezado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecc_totales_id_ecc_fkey"
            columns: ["id_ecc"]
            isOneToOne: true
            referencedRelation: "v_ecc_preview_context"
            referencedColumns: ["ecc_id"]
          },
          {
            foreignKeyName: "ecc_totales_id_ecc_fkey"
            columns: ["id_ecc"]
            isOneToOne: true
            referencedRelation: "v_ecc_resumen"
            referencedColumns: ["id_ecc"]
          },
          {
            foreignKeyName: "ecc_totales_id_ecc_fkey"
            columns: ["id_ecc"]
            isOneToOne: true
            referencedRelation: "v_funnel_comercial_detallado"
            referencedColumns: ["ecc_id"]
          },
        ]
      }
      ejecucion_osi: {
        Row: {
          audiovisuales: boolean
          carnet_impreso: boolean
          certificado_impreso: boolean
          created_at: string
          entrega_certificado: string | null
          fecha_emision: string | null
          fecha_fin_real: string | null
          fecha_firma_administracion: string | null
          fecha_firma_calidad: string | null
          fecha_firma_direccion: string | null
          fecha_firma_negocios: string | null
          fecha_firma_verificacion: string | null
          fecha_inicio_real: string | null
          hora_inicio_servicio: string | null
          horas_academicas_ejecucion: number | null
          id: number
          id_direccion_ejecucion_real: number | null
          id_direccion_envio_real: number | null
          id_ecc: number
          id_ecc_origen: number | null
          id_estatus: number | null
          id_presupuesto: number | null
          id_responsable_recepcion: number | null
          impacto_ecc_delta: number | null
          impacto_ecc_en: string | null
          impacto_ecc_pendiente: boolean
          impacto_ecc_resuelto_por: string | null
          nro_osi_secuencial: string
          observaciones_adicionales_osi: string | null
          participantes_ejecucion: number | null
          pretenciones_adicionales_osi: string | null
          sesiones_ejecucion: number | null
          sesiones_programadas: Json
          status_changed_at: string | null
          updated_at: string
        }
        Insert: {
          audiovisuales?: boolean
          carnet_impreso?: boolean
          certificado_impreso?: boolean
          created_at?: string
          entrega_certificado?: string | null
          fecha_emision?: string | null
          fecha_fin_real?: string | null
          fecha_firma_administracion?: string | null
          fecha_firma_calidad?: string | null
          fecha_firma_direccion?: string | null
          fecha_firma_negocios?: string | null
          fecha_firma_verificacion?: string | null
          fecha_inicio_real?: string | null
          hora_inicio_servicio?: string | null
          horas_academicas_ejecucion?: number | null
          id?: number
          id_direccion_ejecucion_real?: number | null
          id_direccion_envio_real?: number | null
          id_ecc: number
          id_ecc_origen?: number | null
          id_estatus?: number | null
          id_presupuesto?: number | null
          id_responsable_recepcion?: number | null
          impacto_ecc_delta?: number | null
          impacto_ecc_en?: string | null
          impacto_ecc_pendiente?: boolean
          impacto_ecc_resuelto_por?: string | null
          nro_osi_secuencial: string
          observaciones_adicionales_osi?: string | null
          participantes_ejecucion?: number | null
          pretenciones_adicionales_osi?: string | null
          sesiones_ejecucion?: number | null
          sesiones_programadas?: Json
          status_changed_at?: string | null
          updated_at?: string
        }
        Update: {
          audiovisuales?: boolean
          carnet_impreso?: boolean
          certificado_impreso?: boolean
          created_at?: string
          entrega_certificado?: string | null
          fecha_emision?: string | null
          fecha_fin_real?: string | null
          fecha_firma_administracion?: string | null
          fecha_firma_calidad?: string | null
          fecha_firma_direccion?: string | null
          fecha_firma_negocios?: string | null
          fecha_firma_verificacion?: string | null
          fecha_inicio_real?: string | null
          hora_inicio_servicio?: string | null
          horas_academicas_ejecucion?: number | null
          id?: number
          id_direccion_ejecucion_real?: number | null
          id_direccion_envio_real?: number | null
          id_ecc?: number
          id_ecc_origen?: number | null
          id_estatus?: number | null
          id_presupuesto?: number | null
          id_responsable_recepcion?: number | null
          impacto_ecc_delta?: number | null
          impacto_ecc_en?: string | null
          impacto_ecc_pendiente?: boolean
          impacto_ecc_resuelto_por?: string | null
          nro_osi_secuencial?: string
          observaciones_adicionales_osi?: string | null
          participantes_ejecucion?: number | null
          pretenciones_adicionales_osi?: string | null
          sesiones_ejecucion?: number | null
          sesiones_programadas?: Json
          status_changed_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ejecucion_osi_id_direccion_ejecucion_real_fkey"
            columns: ["id_direccion_ejecucion_real"]
            isOneToOne: false
            referencedRelation: "direcciones_cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ejecucion_osi_id_direccion_envio_real_fkey"
            columns: ["id_direccion_envio_real"]
            isOneToOne: false
            referencedRelation: "direcciones_cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ejecucion_osi_id_ecc_fkey"
            columns: ["id_ecc"]
            isOneToOne: false
            referencedRelation: "ecc_encabezado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ejecucion_osi_id_ecc_fkey"
            columns: ["id_ecc"]
            isOneToOne: false
            referencedRelation: "v_ecc_preview_context"
            referencedColumns: ["ecc_id"]
          },
          {
            foreignKeyName: "ejecucion_osi_id_ecc_fkey"
            columns: ["id_ecc"]
            isOneToOne: false
            referencedRelation: "v_ecc_resumen"
            referencedColumns: ["id_ecc"]
          },
          {
            foreignKeyName: "ejecucion_osi_id_ecc_fkey"
            columns: ["id_ecc"]
            isOneToOne: false
            referencedRelation: "v_funnel_comercial_detallado"
            referencedColumns: ["ecc_id"]
          },
          {
            foreignKeyName: "ejecucion_osi_id_estatus_fkey"
            columns: ["id_estatus"]
            isOneToOne: false
            referencedRelation: "conf_estatus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ejecucion_osi_id_presupuesto_fkey"
            columns: ["id_presupuesto"]
            isOneToOne: false
            referencedRelation: "presupuestos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ejecucion_osi_id_responsable_recepcion_fkey"
            columns: ["id_responsable_recepcion"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ejecucion_osi_id_responsable_recepcion_fkey"
            columns: ["id_responsable_recepcion"]
            isOneToOne: false
            referencedRelation: "v_notify_permission_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "ejecucion_osi_id_responsable_recepcion_fkey"
            columns: ["id_responsable_recepcion"]
            isOneToOne: false
            referencedRelation: "v_osi_app_role_members"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      ejecucion_osi_asistencia: {
        Row: {
          category: string | null
          created_at: string | null
          facilitador_id: number | null
          file_name: string
          file_size: number | null
          file_type: string
          id: string
          nro_sesion: number
          osi_id: number | null
          storage_path: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          facilitador_id?: number | null
          file_name: string
          file_size?: number | null
          file_type: string
          id?: string
          nro_sesion?: number
          osi_id?: number | null
          storage_path: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          facilitador_id?: number | null
          file_name?: string
          file_size?: number | null
          file_type?: string
          id?: string
          nro_sesion?: number
          osi_id?: number | null
          storage_path?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ejecucion_osi_asistencia_facilitador_id_fkey"
            columns: ["facilitador_id"]
            isOneToOne: false
            referencedRelation: "facilitadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ejecucion_osi_asistencia_osi_id_fkey"
            columns: ["osi_id"]
            isOneToOne: false
            referencedRelation: "ejecucion_osi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ejecucion_osi_asistencia_osi_id_fkey"
            columns: ["osi_id"]
            isOneToOne: false
            referencedRelation: "v_osi_formato_completo"
            referencedColumns: ["id_osi"]
          },
          {
            foreignKeyName: "ejecucion_osi_asistencia_osi_id_fkey"
            columns: ["osi_id"]
            isOneToOne: false
            referencedRelation: "v_osi_lista"
            referencedColumns: ["id_osi"]
          },
        ]
      }
      ejecucion_osi_participantes: {
        Row: {
          cedula: string
          created_at: string | null
          facilitador_id: number
          id: number
          nombre_apellido: string
          osi_id: number
          score: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          cedula: string
          created_at?: string | null
          facilitador_id: number
          id?: number
          nombre_apellido: string
          osi_id: number
          score?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          cedula?: string
          created_at?: string | null
          facilitador_id?: number
          id?: number
          nombre_apellido?: string
          osi_id?: number
          score?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ejecucion_osi_participantes_facilitador_id_fkey"
            columns: ["facilitador_id"]
            isOneToOne: false
            referencedRelation: "facilitadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ejecucion_osi_participantes_osi_id_fkey"
            columns: ["osi_id"]
            isOneToOne: false
            referencedRelation: "ejecucion_osi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ejecucion_osi_participantes_osi_id_fkey"
            columns: ["osi_id"]
            isOneToOne: false
            referencedRelation: "v_osi_formato_completo"
            referencedColumns: ["id_osi"]
          },
          {
            foreignKeyName: "ejecucion_osi_participantes_osi_id_fkey"
            columns: ["osi_id"]
            isOneToOne: false
            referencedRelation: "v_osi_lista"
            referencedColumns: ["id_osi"]
          },
        ]
      }
      empresa_logos: {
        Row: {
          empresa_id: number
          id: number
          logo_url: string
          storage_path: string
          uploaded_at: string | null
        }
        Insert: {
          empresa_id: number
          id?: never
          logo_url: string
          storage_path: string
          uploaded_at?: string | null
        }
        Update: {
          empresa_id?: number
          id?: never
          logo_url?: string
          storage_path?: string
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empresa_logos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresa_logos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "v_osi_formato_completo"
            referencedColumns: ["id_empresa"]
          },
          {
            foreignKeyName: "empresa_logos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "v_osi_lista"
            referencedColumns: ["id_empresa"]
          },
        ]
      }
      empresa_sedes: {
        Row: {
          esta_activo: boolean
          fecha_creacion: string
          id: number
          id_empresa: number
          id_estado: number | null
          nombre_sede: string
        }
        Insert: {
          esta_activo?: boolean
          fecha_creacion?: string
          id?: number
          id_empresa: number
          id_estado?: number | null
          nombre_sede: string
        }
        Update: {
          esta_activo?: boolean
          fecha_creacion?: string
          id?: number
          id_empresa?: number
          id_estado?: number | null
          nombre_sede?: string
        }
        Relationships: [
          {
            foreignKeyName: "empresa_sedes_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresa_sedes_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "v_osi_formato_completo"
            referencedColumns: ["id_empresa"]
          },
          {
            foreignKeyName: "empresa_sedes_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "v_osi_lista"
            referencedColumns: ["id_empresa"]
          },
          {
            foreignKeyName: "empresa_sedes_id_estado_fkey"
            columns: ["id_estado"]
            isOneToOne: false
            referencedRelation: "cat_estados_venezuela"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          codigo_cliente: number
          direccion_fiscal: string | null
          es_cliente: boolean
          esta_activo: boolean | null
          fecha_creacion: string | null
          id: number
          id_ciudad_ubicacion: number | null
          id_cuenta_bancaria_defecto: number | null
          id_ejecutivo_owner: number | null
          id_estado_ubicacion: number | null
          observaciones: string | null
          que_hace_la_empresa: string | null
          razon_social: string
          rif: string
          sector_industrial: string | null
        }
        Insert: {
          codigo_cliente?: number
          direccion_fiscal?: string | null
          es_cliente?: boolean
          esta_activo?: boolean | null
          fecha_creacion?: string | null
          id?: number
          id_ciudad_ubicacion?: number | null
          id_cuenta_bancaria_defecto?: number | null
          id_ejecutivo_owner?: number | null
          id_estado_ubicacion?: number | null
          observaciones?: string | null
          que_hace_la_empresa?: string | null
          razon_social: string
          rif: string
          sector_industrial?: string | null
        }
        Update: {
          codigo_cliente?: number
          direccion_fiscal?: string | null
          es_cliente?: boolean
          esta_activo?: boolean | null
          fecha_creacion?: string | null
          id?: number
          id_ciudad_ubicacion?: number | null
          id_cuenta_bancaria_defecto?: number | null
          id_ejecutivo_owner?: number | null
          id_estado_ubicacion?: number | null
          observaciones?: string | null
          que_hace_la_empresa?: string | null
          razon_social?: string
          rif?: string
          sector_industrial?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empresas_id_ciudad_ubicacion_fkey"
            columns: ["id_ciudad_ubicacion"]
            isOneToOne: false
            referencedRelation: "cat_ciudades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresas_id_cuenta_bancaria_defecto_fkey"
            columns: ["id_cuenta_bancaria_defecto"]
            isOneToOne: false
            referencedRelation: "datos_bancarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresas_id_ejecutivo_owner_fkey"
            columns: ["id_ejecutivo_owner"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresas_id_ejecutivo_owner_fkey"
            columns: ["id_ejecutivo_owner"]
            isOneToOne: false
            referencedRelation: "v_notify_permission_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "empresas_id_ejecutivo_owner_fkey"
            columns: ["id_ejecutivo_owner"]
            isOneToOne: false
            referencedRelation: "v_osi_app_role_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "empresas_id_estado_ubicacion_fkey"
            columns: ["id_estado_ubicacion"]
            isOneToOne: false
            referencedRelation: "cat_estados_venezuela"
            referencedColumns: ["id"]
          },
        ]
      }
      equipos: {
        Row: {
          codigo_inventario: string
          condiciones_equipo_info: string | null
          esta_activo: boolean | null
          estado_accesorios: string | null
          id: number
          id_estatus: number | null
          id_proveedor_fabricante: number | null
          item_nombre: string
          modelo: string | null
          observaciones_generales: string | null
          serial_fabricante: string | null
          tipo_pila: string | null
          ubicacion_fisica: string | null
        }
        Insert: {
          codigo_inventario: string
          condiciones_equipo_info?: string | null
          esta_activo?: boolean | null
          estado_accesorios?: string | null
          id?: number
          id_estatus?: number | null
          id_proveedor_fabricante?: number | null
          item_nombre: string
          modelo?: string | null
          observaciones_generales?: string | null
          serial_fabricante?: string | null
          tipo_pila?: string | null
          ubicacion_fisica?: string | null
        }
        Update: {
          codigo_inventario?: string
          condiciones_equipo_info?: string | null
          esta_activo?: boolean | null
          estado_accesorios?: string | null
          id?: number
          id_estatus?: number | null
          id_proveedor_fabricante?: number | null
          item_nombre?: string
          modelo?: string | null
          observaciones_generales?: string | null
          serial_fabricante?: string | null
          tipo_pila?: string | null
          ubicacion_fisica?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipos_id_estatus_fkey"
            columns: ["id_estatus"]
            isOneToOne: false
            referencedRelation: "conf_estatus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipos_id_proveedor_fabricante_fkey"
            columns: ["id_proveedor_fabricante"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluaciones_rendimiento: {
        Row: {
          fecha_evaluacion: string | null
          frecuencia_evaluacion: string | null
          id: number
          id_empleado_supervisor: number | null
          id_estatus_evaluacion: number | null
          id_facilitador: number | null
          id_proveedor: number | null
          proxima_evaluacion: string | null
          resultado_evaluacion: number | null
        }
        Insert: {
          fecha_evaluacion?: string | null
          frecuencia_evaluacion?: string | null
          id?: number
          id_empleado_supervisor?: number | null
          id_estatus_evaluacion?: number | null
          id_facilitador?: number | null
          id_proveedor?: number | null
          proxima_evaluacion?: string | null
          resultado_evaluacion?: number | null
        }
        Update: {
          fecha_evaluacion?: string | null
          frecuencia_evaluacion?: string | null
          id?: number
          id_empleado_supervisor?: number | null
          id_estatus_evaluacion?: number | null
          id_facilitador?: number | null
          id_proveedor?: number | null
          proxima_evaluacion?: string | null
          resultado_evaluacion?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluaciones_rendimiento_id_empleado_supervisor_fkey"
            columns: ["id_empleado_supervisor"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluaciones_rendimiento_id_empleado_supervisor_fkey"
            columns: ["id_empleado_supervisor"]
            isOneToOne: false
            referencedRelation: "v_notify_permission_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "evaluaciones_rendimiento_id_empleado_supervisor_fkey"
            columns: ["id_empleado_supervisor"]
            isOneToOne: false
            referencedRelation: "v_osi_app_role_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "evaluaciones_rendimiento_id_estatus_evaluacion_fkey"
            columns: ["id_estatus_evaluacion"]
            isOneToOne: false
            referencedRelation: "conf_estatus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluaciones_rendimiento_id_facilitador_fkey"
            columns: ["id_facilitador"]
            isOneToOne: false
            referencedRelation: "facilitadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluaciones_rendimiento_id_proveedor_fkey"
            columns: ["id_proveedor"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
        ]
      }
      facilitador_acknowledgments: {
        Row: {
          acknowledged_at: string
          disclaimer_text: string
          facilitador_id: number
          id: string
          osi_id: number
        }
        Insert: {
          acknowledged_at?: string
          disclaimer_text: string
          facilitador_id: number
          id?: string
          osi_id: number
        }
        Update: {
          acknowledged_at?: string
          disclaimer_text?: string
          facilitador_id?: number
          id?: string
          osi_id?: number
        }
        Relationships: []
      }
      facilitador_credenciales: {
        Row: {
          created_at: string | null
          facilitador_id: number
          id: number
          is_active: boolean | null
          password_hash: string
          updated_at: string | null
          username: string
        }
        Insert: {
          created_at?: string | null
          facilitador_id: number
          id?: number
          is_active?: boolean | null
          password_hash: string
          updated_at?: string | null
          username: string
        }
        Update: {
          created_at?: string | null
          facilitador_id?: number
          id?: number
          is_active?: boolean | null
          password_hash?: string
          updated_at?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "facilitador_credenciales_facilitador_id_fkey"
            columns: ["facilitador_id"]
            isOneToOne: true
            referencedRelation: "facilitadores"
            referencedColumns: ["id"]
          },
        ]
      }
      facilitador_osi_assignments: {
        Row: {
          assigned_by: string | null
          attachment_received: boolean | null
          attachment_received_at: string | null
          attachment_received_by: string | null
          created_at: string | null
          facilitador_id: number
          id: number
          is_active: boolean | null
          nro_sesion: number | null
          osi_id: number
          source: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_by?: string | null
          attachment_received?: boolean | null
          attachment_received_at?: string | null
          attachment_received_by?: string | null
          created_at?: string | null
          facilitador_id: number
          id?: never
          is_active?: boolean | null
          nro_sesion?: number | null
          osi_id: number
          source?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_by?: string | null
          attachment_received?: boolean | null
          attachment_received_at?: string | null
          attachment_received_by?: string | null
          created_at?: string | null
          facilitador_id?: number
          id?: never
          is_active?: boolean | null
          nro_sesion?: number | null
          osi_id?: number
          source?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_facilitador"
            columns: ["facilitador_id"]
            isOneToOne: false
            referencedRelation: "facilitadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_osi"
            columns: ["osi_id"]
            isOneToOne: false
            referencedRelation: "ejecucion_osi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_osi"
            columns: ["osi_id"]
            isOneToOne: false
            referencedRelation: "v_osi_formato_completo"
            referencedColumns: ["id_osi"]
          },
          {
            foreignKeyName: "fk_osi"
            columns: ["osi_id"]
            isOneToOne: false
            referencedRelation: "v_osi_lista"
            referencedColumns: ["id_osi"]
          },
        ]
      }
      facilitadores: {
        Row: {
          alcance: string | null
          ano_ingreso: number | null
          calificacion: number | null
          cedula: string | null
          direccion: string | null
          email: string | null
          fecha_actualizacion: string | null
          fecha_creacion: string | null
          fecha_ingreso: string | null
          firma_id: number | null
          formacion_docente_certificada: boolean | null
          fuente: string | null
          id: number
          id_ciudad: number | null
          id_estado_geografico: number | null
          is_active: boolean
          nivel_educacion: string | null
          nombre_apellido: string
          notas_observaciones: string | null
          rif: string | null
          telefono: string | null
          temas_cursos: string[]
          tiene_certificaciones: boolean | null
          tiene_curriculum: boolean | null
          tiene_foto_perfil: boolean | null
        }
        Insert: {
          alcance?: string | null
          ano_ingreso?: number | null
          calificacion?: number | null
          cedula?: string | null
          direccion?: string | null
          email?: string | null
          fecha_actualizacion?: string | null
          fecha_creacion?: string | null
          fecha_ingreso?: string | null
          firma_id?: number | null
          formacion_docente_certificada?: boolean | null
          fuente?: string | null
          id?: number
          id_ciudad?: number | null
          id_estado_geografico?: number | null
          is_active?: boolean
          nivel_educacion?: string | null
          nombre_apellido: string
          notas_observaciones?: string | null
          rif?: string | null
          telefono?: string | null
          temas_cursos?: string[]
          tiene_certificaciones?: boolean | null
          tiene_curriculum?: boolean | null
          tiene_foto_perfil?: boolean | null
        }
        Update: {
          alcance?: string | null
          ano_ingreso?: number | null
          calificacion?: number | null
          cedula?: string | null
          direccion?: string | null
          email?: string | null
          fecha_actualizacion?: string | null
          fecha_creacion?: string | null
          fecha_ingreso?: string | null
          firma_id?: number | null
          formacion_docente_certificada?: boolean | null
          fuente?: string | null
          id?: number
          id_ciudad?: number | null
          id_estado_geografico?: number | null
          is_active?: boolean
          nivel_educacion?: string | null
          nombre_apellido?: string
          notas_observaciones?: string | null
          rif?: string | null
          telefono?: string | null
          temas_cursos?: string[]
          tiene_certificaciones?: boolean | null
          tiene_curriculum?: boolean | null
          tiene_foto_perfil?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "facilitadores_firma_id_fkey"
            columns: ["firma_id"]
            isOneToOne: false
            referencedRelation: "firmas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facilitadores_id_ciudad_fkey"
            columns: ["id_ciudad"]
            isOneToOne: false
            referencedRelation: "cat_ciudades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facilitadores_id_estado_geografico_fkey"
            columns: ["id_estado_geografico"]
            isOneToOne: false
            referencedRelation: "cat_estados_venezuela"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_egresos_pagos: {
        Row: {
          comprobante_url: string | null
          fecha_pago_real: string | null
          fecha_programada: string | null
          id: number
          id_cuenta_origen: number | null
          id_estatus: number | null
          id_facilitador: number | null
          id_osi: number | null
          id_proveedor: number | null
          monto_bruto: number
          monto_neto_pagado: number | null
          referencia_egreso: string | null
        }
        Insert: {
          comprobante_url?: string | null
          fecha_pago_real?: string | null
          fecha_programada?: string | null
          id?: number
          id_cuenta_origen?: number | null
          id_estatus?: number | null
          id_facilitador?: number | null
          id_osi?: number | null
          id_proveedor?: number | null
          monto_bruto: number
          monto_neto_pagado?: number | null
          referencia_egreso?: string | null
        }
        Update: {
          comprobante_url?: string | null
          fecha_pago_real?: string | null
          fecha_programada?: string | null
          id?: number
          id_cuenta_origen?: number | null
          id_estatus?: number | null
          id_facilitador?: number | null
          id_osi?: number | null
          id_proveedor?: number | null
          monto_bruto?: number
          monto_neto_pagado?: number | null
          referencia_egreso?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fin_egresos_pagos_id_cuenta_origen_fkey"
            columns: ["id_cuenta_origen"]
            isOneToOne: false
            referencedRelation: "datos_bancarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_egresos_pagos_id_estatus_fkey"
            columns: ["id_estatus"]
            isOneToOne: false
            referencedRelation: "conf_estatus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_egresos_pagos_id_facilitador_fkey"
            columns: ["id_facilitador"]
            isOneToOne: false
            referencedRelation: "facilitadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_egresos_pagos_id_osi_fkey"
            columns: ["id_osi"]
            isOneToOne: false
            referencedRelation: "ejecucion_osi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_egresos_pagos_id_osi_fkey"
            columns: ["id_osi"]
            isOneToOne: false
            referencedRelation: "v_osi_formato_completo"
            referencedColumns: ["id_osi"]
          },
          {
            foreignKeyName: "fin_egresos_pagos_id_osi_fkey"
            columns: ["id_osi"]
            isOneToOne: false
            referencedRelation: "v_osi_lista"
            referencedColumns: ["id_osi"]
          },
          {
            foreignKeyName: "fin_egresos_pagos_id_proveedor_fkey"
            columns: ["id_proveedor"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_ingresos_clientes: {
        Row: {
          fecha_pago: string | null
          id: number
          id_cuenta_destino: number | null
          id_estatus: number | null
          id_presupuesto: number | null
          monto: number
          observaciones: string | null
          referencia: string | null
        }
        Insert: {
          fecha_pago?: string | null
          id?: number
          id_cuenta_destino?: number | null
          id_estatus?: number | null
          id_presupuesto?: number | null
          monto: number
          observaciones?: string | null
          referencia?: string | null
        }
        Update: {
          fecha_pago?: string | null
          id?: number
          id_cuenta_destino?: number | null
          id_estatus?: number | null
          id_presupuesto?: number | null
          monto?: number
          observaciones?: string | null
          referencia?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fin_ingresos_clientes_id_cuenta_destino_fkey"
            columns: ["id_cuenta_destino"]
            isOneToOne: false
            referencedRelation: "datos_bancarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_ingresos_clientes_id_estatus_fkey"
            columns: ["id_estatus"]
            isOneToOne: false
            referencedRelation: "conf_estatus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_ingresos_clientes_id_presupuesto_fkey"
            columns: ["id_presupuesto"]
            isOneToOne: false
            referencedRelation: "presupuestos"
            referencedColumns: ["id"]
          },
        ]
      }
      firmas: {
        Row: {
          facilitador_id: number | null
          fecha_actualizacion: string | null
          fecha_creacion: string | null
          id: number
          imagen_base64: string | null
          is_active: boolean | null
          nombre: string
          tipo: Database["public"]["Enums"]["firma_tipo"]
          url_imagen: string | null
        }
        Insert: {
          facilitador_id?: number | null
          fecha_actualizacion?: string | null
          fecha_creacion?: string | null
          id?: number
          imagen_base64?: string | null
          is_active?: boolean | null
          nombre: string
          tipo: Database["public"]["Enums"]["firma_tipo"]
          url_imagen?: string | null
        }
        Update: {
          facilitador_id?: number | null
          fecha_actualizacion?: string | null
          fecha_creacion?: string | null
          id?: number
          imagen_base64?: string | null
          is_active?: boolean | null
          nombre?: string
          tipo?: Database["public"]["Enums"]["firma_tipo"]
          url_imagen?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "firmas_facilitador_id_fkey"
            columns: ["facilitador_id"]
            isOneToOne: true
            referencedRelation: "facilitadores"
            referencedColumns: ["id"]
          },
        ]
      }
      gerencias: {
        Row: {
          created_at: string
          id: number
          lider: number | null
          nombre: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          lider?: number | null
          nombre?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          lider?: number | null
          nombre?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gerencias_lider_fkey"
            columns: ["lider"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gerencias_lider_fkey"
            columns: ["lider"]
            isOneToOne: false
            referencedRelation: "v_notify_permission_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "gerencias_lider_fkey"
            columns: ["lider"]
            isOneToOne: false
            referencedRelation: "v_osi_app_role_members"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      historial_calibracion: {
        Row: {
          certificado_nro: string | null
          fecha_calibracion: string
          fecha_vencimiento: string
          frecuencia_meses: number | null
          id: number
          id_equipo: number | null
          observaciones: string | null
        }
        Insert: {
          certificado_nro?: string | null
          fecha_calibracion: string
          fecha_vencimiento: string
          frecuencia_meses?: number | null
          id?: number
          id_equipo?: number | null
          observaciones?: string | null
        }
        Update: {
          certificado_nro?: string | null
          fecha_calibracion?: string
          fecha_vencimiento?: string
          frecuencia_meses?: number | null
          id?: number
          id_equipo?: number | null
          observaciones?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historial_calibracion_id_equipo_fkey"
            columns: ["id_equipo"]
            isOneToOne: false
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
        ]
      }
      historial_cambios_estado: {
        Row: {
          fecha_cambio: string | null
          id: number
          id_estatus_anterior: number | null
          id_estatus_nuevo: number | null
          id_registro: number | null
          id_usuario_cambio: number | null
          tabla_afectada: string | null
        }
        Insert: {
          fecha_cambio?: string | null
          id?: number
          id_estatus_anterior?: number | null
          id_estatus_nuevo?: number | null
          id_registro?: number | null
          id_usuario_cambio?: number | null
          tabla_afectada?: string | null
        }
        Update: {
          fecha_cambio?: string | null
          id?: number
          id_estatus_anterior?: number | null
          id_estatus_nuevo?: number | null
          id_registro?: number | null
          id_usuario_cambio?: number | null
          tabla_afectada?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historial_cambios_estado_id_estado_anterior_fkey"
            columns: ["id_estatus_anterior"]
            isOneToOne: false
            referencedRelation: "conf_estatus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historial_cambios_estado_id_estado_nuevo_fkey"
            columns: ["id_estatus_nuevo"]
            isOneToOne: false
            referencedRelation: "conf_estatus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historial_cambios_estado_id_usuario_cambio_fkey"
            columns: ["id_usuario_cambio"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historial_cambios_estado_id_usuario_cambio_fkey"
            columns: ["id_usuario_cambio"]
            isOneToOne: false
            referencedRelation: "v_notify_permission_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "historial_cambios_estado_id_usuario_cambio_fkey"
            columns: ["id_usuario_cambio"]
            isOneToOne: false
            referencedRelation: "v_osi_app_role_members"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      inventario: {
        Row: {
          clave_windows: string | null
          correo_corporativo: string | null
          correo_personal: string | null
          creado_en: string | null
          departamento: string | null
          espacio_ssd_hdd: string | null
          id: string
          id_departamento: number | null
          id_producto: string | null
          nombre_dispositivo: string | null
          nombre_usuario: string | null
          numero_extension: string | null
          procesador: string | null
          ram_instalada: string | null
          tarjeta_grafica: string | null
          telefono_corporativo: string | null
          telefono_personal: string | null
          usuario_windows: string | null
          velocidad_tarjeta_red: string | null
          version_windows: string | null
        }
        Insert: {
          clave_windows?: string | null
          correo_corporativo?: string | null
          correo_personal?: string | null
          creado_en?: string | null
          departamento?: string | null
          espacio_ssd_hdd?: string | null
          id?: string
          id_departamento?: number | null
          id_producto?: string | null
          nombre_dispositivo?: string | null
          nombre_usuario?: string | null
          numero_extension?: string | null
          procesador?: string | null
          ram_instalada?: string | null
          tarjeta_grafica?: string | null
          telefono_corporativo?: string | null
          telefono_personal?: string | null
          usuario_windows?: string | null
          velocidad_tarjeta_red?: string | null
          version_windows?: string | null
        }
        Update: {
          clave_windows?: string | null
          correo_corporativo?: string | null
          correo_personal?: string | null
          creado_en?: string | null
          departamento?: string | null
          espacio_ssd_hdd?: string | null
          id?: string
          id_departamento?: number | null
          id_producto?: string | null
          nombre_dispositivo?: string | null
          nombre_usuario?: string | null
          numero_extension?: string | null
          procesador?: string | null
          ram_instalada?: string | null
          tarjeta_grafica?: string | null
          telefono_corporativo?: string | null
          telefono_personal?: string | null
          usuario_windows?: string | null
          velocidad_tarjeta_red?: string | null
          version_windows?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventario_id_departamento_fkey"
            columns: ["id_departamento"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_leads: {
        Row: {
          created_at: string
          es_recontacto: boolean
          fecha_ingreso: string | null
          fecha_ultimo_recontacto: string | null
          id: number
          id_ciudad_ubicacion: number | null
          id_contacto: number | null
          id_departamento_recibe: number | null
          id_ejecutivo_owner: number | null
          id_ejecutivo_recibe: number | null
          id_estado_ubicacion: number | null
          id_estatus: number | null
          id_origen: number | null
          id_servicio_interes: number | null
          intereses_recontacto: Json
          is_duplicate: boolean | null
          notas_adicionales: string | null
          raw_email: string | null
          raw_empresa: string | null
          raw_nombre_apellido: string | null
          raw_telefono: string | null
          status_changed_at: string | null
          telefono_ejecutivo: string | null
          tipo_cliente: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          es_recontacto?: boolean
          fecha_ingreso?: string | null
          fecha_ultimo_recontacto?: string | null
          id?: number
          id_ciudad_ubicacion?: number | null
          id_contacto?: number | null
          id_departamento_recibe?: number | null
          id_ejecutivo_owner?: number | null
          id_ejecutivo_recibe?: number | null
          id_estado_ubicacion?: number | null
          id_estatus?: number | null
          id_origen?: number | null
          id_servicio_interes?: number | null
          intereses_recontacto?: Json
          is_duplicate?: boolean | null
          notas_adicionales?: string | null
          raw_email?: string | null
          raw_empresa?: string | null
          raw_nombre_apellido?: string | null
          raw_telefono?: string | null
          status_changed_at?: string | null
          telefono_ejecutivo?: string | null
          tipo_cliente?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          es_recontacto?: boolean
          fecha_ingreso?: string | null
          fecha_ultimo_recontacto?: string | null
          id?: number
          id_ciudad_ubicacion?: number | null
          id_contacto?: number | null
          id_departamento_recibe?: number | null
          id_ejecutivo_owner?: number | null
          id_ejecutivo_recibe?: number | null
          id_estado_ubicacion?: number | null
          id_estatus?: number | null
          id_origen?: number | null
          id_servicio_interes?: number | null
          intereses_recontacto?: Json
          is_duplicate?: boolean | null
          notas_adicionales?: string | null
          raw_email?: string | null
          raw_empresa?: string | null
          raw_nombre_apellido?: string | null
          raw_telefono?: string | null
          status_changed_at?: string | null
          telefono_ejecutivo?: string | null
          tipo_cliente?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_leads_id_ciudad_ubicacion_fkey"
            columns: ["id_ciudad_ubicacion"]
            isOneToOne: false
            referencedRelation: "cat_ciudades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_leads_id_contacto_fkey1"
            columns: ["id_contacto"]
            isOneToOne: false
            referencedRelation: "contactos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_leads_id_departamento_recibe_fkey1"
            columns: ["id_departamento_recibe"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_leads_id_ejecutivo_owner_fkey1"
            columns: ["id_ejecutivo_owner"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_leads_id_ejecutivo_owner_fkey1"
            columns: ["id_ejecutivo_owner"]
            isOneToOne: false
            referencedRelation: "v_notify_permission_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "marketing_leads_id_ejecutivo_owner_fkey1"
            columns: ["id_ejecutivo_owner"]
            isOneToOne: false
            referencedRelation: "v_osi_app_role_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "marketing_leads_id_ejecutivo_recibe_fkey1"
            columns: ["id_ejecutivo_recibe"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_leads_id_ejecutivo_recibe_fkey1"
            columns: ["id_ejecutivo_recibe"]
            isOneToOne: false
            referencedRelation: "v_notify_permission_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "marketing_leads_id_ejecutivo_recibe_fkey1"
            columns: ["id_ejecutivo_recibe"]
            isOneToOne: false
            referencedRelation: "v_osi_app_role_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "marketing_leads_id_estado_ubicacion_fkey"
            columns: ["id_estado_ubicacion"]
            isOneToOne: false
            referencedRelation: "cat_estados_venezuela"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_leads_id_estatus_fkey1"
            columns: ["id_estatus"]
            isOneToOne: false
            referencedRelation: "conf_estatus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_leads_id_origen_fkey1"
            columns: ["id_origen"]
            isOneToOne: false
            referencedRelation: "cat_origenes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_leads_id_servicio_interes_fkey1"
            columns: ["id_servicio_interes"]
            isOneToOne: false
            referencedRelation: "catalogo_servicios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_leads_id_servicio_interes_fkey1"
            columns: ["id_servicio_interes"]
            isOneToOne: false
            referencedRelation: "v_osi_formato_completo"
            referencedColumns: ["id_servicio"]
          },
        ]
      }
      marketing_leads_test_abril: {
        Row: {
          fecha_ingreso: string | null
          id: number
          id_contacto: number | null
          id_departamento_recibe: number | null
          id_ejecutivo_owner: number | null
          id_ejecutivo_recibe: number | null
          id_estatus: number | null
          id_origen: number | null
          id_servicio_interes: number | null
          is_duplicate: boolean | null
          notas_adicionales: string | null
          raw_email: string | null
          raw_empresa: string | null
          raw_nombre_apellido: string | null
          raw_telefono: string | null
          telefono_ejecutivo: string | null
        }
        Insert: {
          fecha_ingreso?: string | null
          id?: number
          id_contacto?: number | null
          id_departamento_recibe?: number | null
          id_ejecutivo_owner?: number | null
          id_ejecutivo_recibe?: number | null
          id_estatus?: number | null
          id_origen?: number | null
          id_servicio_interes?: number | null
          is_duplicate?: boolean | null
          notas_adicionales?: string | null
          raw_email?: string | null
          raw_empresa?: string | null
          raw_nombre_apellido?: string | null
          raw_telefono?: string | null
          telefono_ejecutivo?: string | null
        }
        Update: {
          fecha_ingreso?: string | null
          id?: number
          id_contacto?: number | null
          id_departamento_recibe?: number | null
          id_ejecutivo_owner?: number | null
          id_ejecutivo_recibe?: number | null
          id_estatus?: number | null
          id_origen?: number | null
          id_servicio_interes?: number | null
          is_duplicate?: boolean | null
          notas_adicionales?: string | null
          raw_email?: string | null
          raw_empresa?: string | null
          raw_nombre_apellido?: string | null
          raw_telefono?: string | null
          telefono_ejecutivo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_leads_id_contacto_fkey"
            columns: ["id_contacto"]
            isOneToOne: false
            referencedRelation: "contactos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_leads_id_departamento_recibe_fkey"
            columns: ["id_departamento_recibe"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_leads_id_ejecutivo_owner_fkey"
            columns: ["id_ejecutivo_owner"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_leads_id_ejecutivo_owner_fkey"
            columns: ["id_ejecutivo_owner"]
            isOneToOne: false
            referencedRelation: "v_notify_permission_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "marketing_leads_id_ejecutivo_owner_fkey"
            columns: ["id_ejecutivo_owner"]
            isOneToOne: false
            referencedRelation: "v_osi_app_role_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "marketing_leads_id_ejecutivo_recibe_fkey"
            columns: ["id_ejecutivo_recibe"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_leads_id_ejecutivo_recibe_fkey"
            columns: ["id_ejecutivo_recibe"]
            isOneToOne: false
            referencedRelation: "v_notify_permission_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "marketing_leads_id_ejecutivo_recibe_fkey"
            columns: ["id_ejecutivo_recibe"]
            isOneToOne: false
            referencedRelation: "v_osi_app_role_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "marketing_leads_id_estatus_fkey"
            columns: ["id_estatus"]
            isOneToOne: false
            referencedRelation: "conf_estatus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_leads_id_origen_fkey"
            columns: ["id_origen"]
            isOneToOne: false
            referencedRelation: "cat_origenes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_leads_id_servicio_interes_fkey"
            columns: ["id_servicio_interes"]
            isOneToOne: false
            referencedRelation: "catalogo_servicios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_leads_id_servicio_interes_fkey"
            columns: ["id_servicio_interes"]
            isOneToOne: false
            referencedRelation: "v_osi_formato_completo"
            referencedColumns: ["id_servicio"]
          },
        ]
      }
      modalidades: {
        Row: {
          id: number
          nombre: string
        }
        Insert: {
          id?: number
          nombre: string
        }
        Update: {
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      osi_cost_visibility_config: {
        Row: {
          allowed_departamento_ids: Json
          allowed_role_slugs: Json
          allowed_user_ids: Json
          default_hide_monetary: boolean
          default_public_cost_mask: Json
          default_st_garantia_dias: number
          denied_user_ids: Json
          formato: string
          updated_at: string
        }
        Insert: {
          allowed_departamento_ids?: Json
          allowed_role_slugs?: Json
          allowed_user_ids?: Json
          default_hide_monetary?: boolean
          default_public_cost_mask?: Json
          default_st_garantia_dias?: number
          denied_user_ids?: Json
          formato: string
          updated_at?: string
        }
        Update: {
          allowed_departamento_ids?: Json
          allowed_role_slugs?: Json
          allowed_user_ids?: Json
          default_hide_monetary?: boolean
          default_public_cost_mask?: Json
          default_st_garantia_dias?: number
          denied_user_ids?: Json
          formato?: string
          updated_at?: string
        }
        Relationships: []
      }
      osi_recursos_estimados: {
        Row: {
          bateria_incluida: boolean | null
          costo_bateria: number | null
          costo_carnetizacion: number | null
          costo_dias_especialista: number | null
          costo_honorarios_instructor: number | null
          costo_hospedaje: number | null
          costo_impresion_material: number | null
          costo_logistica_comida: number | null
          costo_otros: number | null
          costo_pop: number | null
          costo_traslado: number | null
          created_at: string | null
          dias_hospedaje_facilitador: number | null
          dias_logistica_facilitador: number | null
          horas_honorarios_instructor: number | null
          id: number
          id_osi: number
          id_sesion: number | null
          impresion_material_incluida: boolean | null
          incluye_refrigerio: boolean
          pop_incluido: boolean | null
          public_cost_mask: Json
          st_analistas: number | null
          st_dias_campo: number | null
          st_dias_informe: number | null
          st_dias_revision: number | null
          st_envio_factura: number | null
          st_envio_materiales: number | null
          st_logistica_recursos: number | null
          st_otros_texto: string | null
          st_seguimiento_garantia: string | null
          st_traslados: Json | null
          tarifa_hora_honorarios: number | null
          traslado_externo: number | null
        }
        Insert: {
          bateria_incluida?: boolean | null
          costo_bateria?: number | null
          costo_carnetizacion?: number | null
          costo_dias_especialista?: number | null
          costo_honorarios_instructor?: number | null
          costo_hospedaje?: number | null
          costo_impresion_material?: number | null
          costo_logistica_comida?: number | null
          costo_otros?: number | null
          costo_pop?: number | null
          costo_traslado?: number | null
          created_at?: string | null
          dias_hospedaje_facilitador?: number | null
          dias_logistica_facilitador?: number | null
          horas_honorarios_instructor?: number | null
          id?: number
          id_osi: number
          id_sesion?: number | null
          impresion_material_incluida?: boolean | null
          incluye_refrigerio?: boolean
          pop_incluido?: boolean | null
          public_cost_mask?: Json
          st_analistas?: number | null
          st_dias_campo?: number | null
          st_dias_informe?: number | null
          st_dias_revision?: number | null
          st_envio_factura?: number | null
          st_envio_materiales?: number | null
          st_logistica_recursos?: number | null
          st_otros_texto?: string | null
          st_seguimiento_garantia?: string | null
          st_traslados?: Json | null
          tarifa_hora_honorarios?: number | null
          traslado_externo?: number | null
        }
        Update: {
          bateria_incluida?: boolean | null
          costo_bateria?: number | null
          costo_carnetizacion?: number | null
          costo_dias_especialista?: number | null
          costo_honorarios_instructor?: number | null
          costo_hospedaje?: number | null
          costo_impresion_material?: number | null
          costo_logistica_comida?: number | null
          costo_otros?: number | null
          costo_pop?: number | null
          costo_traslado?: number | null
          created_at?: string | null
          dias_hospedaje_facilitador?: number | null
          dias_logistica_facilitador?: number | null
          horas_honorarios_instructor?: number | null
          id?: number
          id_osi?: number
          id_sesion?: number | null
          impresion_material_incluida?: boolean | null
          incluye_refrigerio?: boolean
          pop_incluido?: boolean | null
          public_cost_mask?: Json
          st_analistas?: number | null
          st_dias_campo?: number | null
          st_dias_informe?: number | null
          st_dias_revision?: number | null
          st_envio_factura?: number | null
          st_envio_materiales?: number | null
          st_logistica_recursos?: number | null
          st_otros_texto?: string | null
          st_seguimiento_garantia?: string | null
          st_traslados?: Json | null
          tarifa_hora_honorarios?: number | null
          traslado_externo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "osi_recursos_estimados_id_osi_fkey"
            columns: ["id_osi"]
            isOneToOne: false
            referencedRelation: "ejecucion_osi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "osi_recursos_estimados_id_osi_fkey"
            columns: ["id_osi"]
            isOneToOne: false
            referencedRelation: "v_osi_formato_completo"
            referencedColumns: ["id_osi"]
          },
          {
            foreignKeyName: "osi_recursos_estimados_id_osi_fkey"
            columns: ["id_osi"]
            isOneToOne: false
            referencedRelation: "v_osi_lista"
            referencedColumns: ["id_osi"]
          },
          {
            foreignKeyName: "osi_recursos_estimados_id_sesion_fkey"
            columns: ["id_sesion"]
            isOneToOne: false
            referencedRelation: "osi_sesion"
            referencedColumns: ["id"]
          },
        ]
      }
      osi_sesion: {
        Row: {
          created_at: string
          ejecutada_en_fecha_planificada: boolean | null
          fecha: string
          fecha_ejecutada: string | null
          hora_ejecutada: string | null
          hora_fin: string | null
          hora_inicio: string | null
          id: number
          id_osi: number
          nro_sesion: number
        }
        Insert: {
          created_at?: string
          ejecutada_en_fecha_planificada?: boolean | null
          fecha: string
          fecha_ejecutada?: string | null
          hora_ejecutada?: string | null
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: number
          id_osi: number
          nro_sesion: number
        }
        Update: {
          created_at?: string
          ejecutada_en_fecha_planificada?: boolean | null
          fecha?: string
          fecha_ejecutada?: string | null
          hora_ejecutada?: string | null
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: number
          id_osi?: number
          nro_sesion?: number
        }
        Relationships: [
          {
            foreignKeyName: "osi_sesion_id_osi_fkey"
            columns: ["id_osi"]
            isOneToOne: false
            referencedRelation: "ejecucion_osi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "osi_sesion_id_osi_fkey"
            columns: ["id_osi"]
            isOneToOne: false
            referencedRelation: "v_osi_formato_completo"
            referencedColumns: ["id_osi"]
          },
          {
            foreignKeyName: "osi_sesion_id_osi_fkey"
            columns: ["id_osi"]
            isOneToOne: false
            referencedRelation: "v_osi_lista"
            referencedColumns: ["id_osi"]
          },
        ]
      }
      osi_visibilidad_cliente: {
        Row: {
          id: number
          oculto: boolean
          osi_id: number
          updated_at: string
          updated_by: number | null
        }
        Insert: {
          id?: number
          oculto?: boolean
          osi_id: number
          updated_at?: string
          updated_by?: number | null
        }
        Update: {
          id?: number
          oculto?: boolean
          osi_id?: number
          updated_at?: string
          updated_by?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "osi_visibilidad_cliente_osi_id_fkey"
            columns: ["osi_id"]
            isOneToOne: true
            referencedRelation: "ejecucion_osi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "osi_visibilidad_cliente_osi_id_fkey"
            columns: ["osi_id"]
            isOneToOne: true
            referencedRelation: "v_osi_formato_completo"
            referencedColumns: ["id_osi"]
          },
          {
            foreignKeyName: "osi_visibilidad_cliente_osi_id_fkey"
            columns: ["osi_id"]
            isOneToOne: true
            referencedRelation: "v_osi_lista"
            referencedColumns: ["id_osi"]
          },
        ]
      }
      participantes_certificados: {
        Row: {
          cedula: string | null
          created_at: string | null
          empresa_actual: string | null
          id: number
          is_active: boolean | null
          nacionalidad: string | null
          nombre: string | null
        }
        Insert: {
          cedula?: string | null
          created_at?: string | null
          empresa_actual?: string | null
          id?: number
          is_active?: boolean | null
          nacionalidad?: string | null
          nombre?: string | null
        }
        Update: {
          cedula?: string | null
          created_at?: string | null
          empresa_actual?: string | null
          id?: number
          is_active?: boolean | null
          nacionalidad?: string | null
          nombre?: string | null
        }
        Relationships: []
      }
      plantillas_carnets: {
        Row: {
          archivo: string
          created_at: string | null
          id: number
          is_active: boolean | null
          nombre: string
          tipo: string | null
          updated_at: string | null
          url_imagen: string | null
        }
        Insert: {
          archivo: string
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          nombre: string
          tipo?: string | null
          updated_at?: string | null
          url_imagen?: string | null
        }
        Update: {
          archivo?: string
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          nombre?: string
          tipo?: string | null
          updated_at?: string | null
          url_imagen?: string | null
        }
        Relationships: []
      }
      plantillas_certificados: {
        Row: {
          archivo: string | null
          created_at: string | null
          id: number
          is_active: boolean
          nombre: string
          updated_at: string | null
          url_imagen: string | null
        }
        Insert: {
          archivo?: string | null
          created_at?: string | null
          id?: number
          is_active?: boolean
          nombre: string
          updated_at?: string | null
          url_imagen?: string | null
        }
        Update: {
          archivo?: string | null
          created_at?: string | null
          id?: number
          is_active?: boolean
          nombre?: string
          updated_at?: string | null
          url_imagen?: string | null
        }
        Relationships: []
      }
      plantillas_cursos: {
        Row: {
          contenido: string | null
          created_at: string | null
          descripcion: string | null
          id: number
          id_curso: number | null
          id_empresa: number | null
          is_active: boolean | null
          titulo_certificado: string | null
        }
        Insert: {
          contenido?: string | null
          created_at?: string | null
          descripcion?: string | null
          id?: number
          id_curso?: number | null
          id_empresa?: number | null
          is_active?: boolean | null
          titulo_certificado?: string | null
        }
        Update: {
          contenido?: string | null
          created_at?: string | null
          descripcion?: string | null
          id?: number
          id_curso?: number | null
          id_empresa?: number | null
          is_active?: boolean | null
          titulo_certificado?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plantillas_cursos_id_curso_fkey"
            columns: ["id_curso"]
            isOneToOne: false
            referencedRelation: "catalogo_servicios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plantillas_cursos_id_curso_fkey"
            columns: ["id_curso"]
            isOneToOne: false
            referencedRelation: "v_osi_formato_completo"
            referencedColumns: ["id_servicio"]
          },
          {
            foreignKeyName: "plantillas_cursos_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plantillas_cursos_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "v_osi_formato_completo"
            referencedColumns: ["id_empresa"]
          },
          {
            foreignKeyName: "plantillas_cursos_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "v_osi_lista"
            referencedColumns: ["id_empresa"]
          },
        ]
      }
      presupuesto_comprobaciones: {
        Row: {
          fecha_comprobante: string
          id: number
          id_ecc: number | null
          id_presupuesto: number
          id_sesion: number | null
          monto_usd: number | null
          nro_sesion: number | null
          numero_comprobante: string
          registrado_at: string
          registrado_por: number | null
          tipo_id: number
        }
        Insert: {
          fecha_comprobante: string
          id?: number
          id_ecc?: number | null
          id_presupuesto: number
          id_sesion?: number | null
          monto_usd?: number | null
          nro_sesion?: number | null
          numero_comprobante: string
          registrado_at?: string
          registrado_por?: number | null
          tipo_id: number
        }
        Update: {
          fecha_comprobante?: string
          id?: number
          id_ecc?: number | null
          id_presupuesto?: number
          id_sesion?: number | null
          monto_usd?: number | null
          nro_sesion?: number | null
          numero_comprobante?: string
          registrado_at?: string
          registrado_por?: number | null
          tipo_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "presupuesto_comprobaciones_id_ecc_fkey"
            columns: ["id_ecc"]
            isOneToOne: false
            referencedRelation: "ecc_encabezado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presupuesto_comprobaciones_id_ecc_fkey"
            columns: ["id_ecc"]
            isOneToOne: false
            referencedRelation: "v_ecc_preview_context"
            referencedColumns: ["ecc_id"]
          },
          {
            foreignKeyName: "presupuesto_comprobaciones_id_ecc_fkey"
            columns: ["id_ecc"]
            isOneToOne: false
            referencedRelation: "v_ecc_resumen"
            referencedColumns: ["id_ecc"]
          },
          {
            foreignKeyName: "presupuesto_comprobaciones_id_ecc_fkey"
            columns: ["id_ecc"]
            isOneToOne: false
            referencedRelation: "v_funnel_comercial_detallado"
            referencedColumns: ["ecc_id"]
          },
          {
            foreignKeyName: "presupuesto_comprobaciones_id_presupuesto_fkey"
            columns: ["id_presupuesto"]
            isOneToOne: false
            referencedRelation: "presupuestos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presupuesto_comprobaciones_id_sesion_fkey"
            columns: ["id_sesion"]
            isOneToOne: false
            referencedRelation: "osi_sesion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presupuesto_comprobaciones_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presupuesto_comprobaciones_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "v_notify_permission_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "presupuesto_comprobaciones_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "v_osi_app_role_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "presupuesto_comprobaciones_tipo_id_fkey"
            columns: ["tipo_id"]
            isOneToOne: false
            referencedRelation: "presupuesto_comprobante_tipos"
            referencedColumns: ["id"]
          },
        ]
      }
      presupuesto_comprobante_tipos: {
        Row: {
          activo: boolean
          created_at: string
          cuenta_como_venta: boolean
          id: number
          nombre: string
          orden: number
          slug: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          cuenta_como_venta?: boolean
          id?: number
          nombre: string
          orden?: number
          slug: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          cuenta_como_venta?: boolean
          id?: number
          nombre?: string
          orden?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      presupuesto_detalles: {
        Row: {
          cantidad: number | null
          codigo_servicio: string | null
          descripcion_comercial: string | null
          fecha_aprobacion_contable: string | null
          fecha_facturacion_contable: string | null
          id: number
          id_ecc: number
          id_estatus: number | null
          id_presupuesto: number
          monto_decision_usd: number | null
          monto_iva: number | null
          precio_unitario: number | null
          total_item: number | null
        }
        Insert: {
          cantidad?: number | null
          codigo_servicio?: string | null
          descripcion_comercial?: string | null
          fecha_aprobacion_contable?: string | null
          fecha_facturacion_contable?: string | null
          id?: number
          id_ecc: number
          id_estatus?: number | null
          id_presupuesto: number
          monto_decision_usd?: number | null
          monto_iva?: number | null
          precio_unitario?: number | null
          total_item?: number | null
        }
        Update: {
          cantidad?: number | null
          codigo_servicio?: string | null
          descripcion_comercial?: string | null
          fecha_aprobacion_contable?: string | null
          fecha_facturacion_contable?: string | null
          id?: number
          id_ecc?: number
          id_estatus?: number | null
          id_presupuesto?: number
          monto_decision_usd?: number | null
          monto_iva?: number | null
          precio_unitario?: number | null
          total_item?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_pres_ecc"
            columns: ["id_ecc"]
            isOneToOne: false
            referencedRelation: "ecc_encabezado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_pres_ecc"
            columns: ["id_ecc"]
            isOneToOne: false
            referencedRelation: "v_ecc_preview_context"
            referencedColumns: ["ecc_id"]
          },
          {
            foreignKeyName: "fk_pres_ecc"
            columns: ["id_ecc"]
            isOneToOne: false
            referencedRelation: "v_ecc_resumen"
            referencedColumns: ["id_ecc"]
          },
          {
            foreignKeyName: "fk_pres_ecc"
            columns: ["id_ecc"]
            isOneToOne: false
            referencedRelation: "v_funnel_comercial_detallado"
            referencedColumns: ["ecc_id"]
          },
          {
            foreignKeyName: "fk_pres_maestro"
            columns: ["id_presupuesto"]
            isOneToOne: false
            referencedRelation: "presupuestos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presupuesto_detalles_id_estatus_fkey"
            columns: ["id_estatus"]
            isOneToOne: false
            referencedRelation: "conf_estatus"
            referencedColumns: ["id"]
          },
        ]
      }
      presupuesto_terminos: {
        Row: {
          contenido: string
          created_at: string
          id: number
          id_presupuesto: number
          orden: number
        }
        Insert: {
          contenido: string
          created_at?: string
          id?: number
          id_presupuesto: number
          orden: number
        }
        Update: {
          contenido?: string
          created_at?: string
          id?: number
          id_presupuesto?: number
          orden?: number
        }
        Relationships: [
          {
            foreignKeyName: "presupuesto_terminos_id_presupuesto_fkey"
            columns: ["id_presupuesto"]
            isOneToOne: false
            referencedRelation: "presupuestos"
            referencedColumns: ["id"]
          },
        ]
      }
      presupuestos: {
        Row: {
          created_at: string
          cuerpo_presupuesto_html: string | null
          fecha_aprobacion_contable: string | null
          fecha_emision: string | null
          fecha_proyectado: string | null
          fecha_venta_contable: string | null
          id: number
          id_datos_bancarios: number | null
          id_estatus: number | null
          id_presupuesto_origen_clon: number | null
          id_trato: number | null
          metodo_pago_divisa: string
          motivo_rechazo: string | null
          nro_actualizaciones: number
          nro_presupuesto: number | null
          otros_gastos_cliente: number | null
          proyeccion_expira_en: string | null
          proyeccion_reintentos: number
          status_changed_at: string | null
          tiempo_vigencia: string | null
          updated_at: string
          valido_hasta: string | null
        }
        Insert: {
          created_at?: string
          cuerpo_presupuesto_html?: string | null
          fecha_aprobacion_contable?: string | null
          fecha_emision?: string | null
          fecha_proyectado?: string | null
          fecha_venta_contable?: string | null
          id?: number
          id_datos_bancarios?: number | null
          id_estatus?: number | null
          id_presupuesto_origen_clon?: number | null
          id_trato?: number | null
          metodo_pago_divisa?: string
          motivo_rechazo?: string | null
          nro_actualizaciones?: number
          nro_presupuesto?: number | null
          otros_gastos_cliente?: number | null
          proyeccion_expira_en?: string | null
          proyeccion_reintentos?: number
          status_changed_at?: string | null
          tiempo_vigencia?: string | null
          updated_at?: string
          valido_hasta?: string | null
        }
        Update: {
          created_at?: string
          cuerpo_presupuesto_html?: string | null
          fecha_aprobacion_contable?: string | null
          fecha_emision?: string | null
          fecha_proyectado?: string | null
          fecha_venta_contable?: string | null
          id?: number
          id_datos_bancarios?: number | null
          id_estatus?: number | null
          id_presupuesto_origen_clon?: number | null
          id_trato?: number | null
          metodo_pago_divisa?: string
          motivo_rechazo?: string | null
          nro_actualizaciones?: number
          nro_presupuesto?: number | null
          otros_gastos_cliente?: number | null
          proyeccion_expira_en?: string | null
          proyeccion_reintentos?: number
          status_changed_at?: string | null
          tiempo_vigencia?: string | null
          updated_at?: string
          valido_hasta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_presupuestos_datos_bancarios"
            columns: ["id_datos_bancarios"]
            isOneToOne: false
            referencedRelation: "datos_bancarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presupuestos_id_estatus_fkey"
            columns: ["id_estatus"]
            isOneToOne: false
            referencedRelation: "conf_estatus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presupuestos_id_negocio_fkey"
            columns: ["id_trato"]
            isOneToOne: false
            referencedRelation: "tratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presupuestos_id_negocio_fkey"
            columns: ["id_trato"]
            isOneToOne: false
            referencedRelation: "v_ecc_preview_context"
            referencedColumns: ["trato_table_id"]
          },
          {
            foreignKeyName: "presupuestos_id_negocio_fkey"
            columns: ["id_trato"]
            isOneToOne: false
            referencedRelation: "v_funnel_comercial_detallado"
            referencedColumns: ["trato_id"]
          },
          {
            foreignKeyName: "presupuestos_id_presupuesto_origen_clon_fkey"
            columns: ["id_presupuesto_origen_clon"]
            isOneToOne: false
            referencedRelation: "presupuestos"
            referencedColumns: ["id"]
          },
        ]
      }
      proveedores: {
        Row: {
          cedula_contacto: string | null
          direccion_fiscal: string | null
          direccion_referencia: string | null
          email: string | null
          fuente: string | null
          id: number
          id_ciudad: number | null
          id_estado_geografico: number | null
          id_estatus: number | null
          nombre_razon_social: string
          notas_observaciones: string | null
          persona_contacto: string | null
          producto_servicio_admin: string | null
          rif_proveedor: string | null
          telefono: string | null
          tipo_impacto: string | null
        }
        Insert: {
          cedula_contacto?: string | null
          direccion_fiscal?: string | null
          direccion_referencia?: string | null
          email?: string | null
          fuente?: string | null
          id?: number
          id_ciudad?: number | null
          id_estado_geografico?: number | null
          id_estatus?: number | null
          nombre_razon_social: string
          notas_observaciones?: string | null
          persona_contacto?: string | null
          producto_servicio_admin?: string | null
          rif_proveedor?: string | null
          telefono?: string | null
          tipo_impacto?: string | null
        }
        Update: {
          cedula_contacto?: string | null
          direccion_fiscal?: string | null
          direccion_referencia?: string | null
          email?: string | null
          fuente?: string | null
          id?: number
          id_ciudad?: number | null
          id_estado_geografico?: number | null
          id_estatus?: number | null
          nombre_razon_social?: string
          notas_observaciones?: string | null
          persona_contacto?: string | null
          producto_servicio_admin?: string | null
          rif_proveedor?: string | null
          telefono?: string | null
          tipo_impacto?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proveedores_id_ciudad_fkey"
            columns: ["id_ciudad"]
            isOneToOne: false
            referencedRelation: "cat_ciudades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proveedores_id_estado_geografico_fkey"
            columns: ["id_estado_geografico"]
            isOneToOne: false
            referencedRelation: "cat_estados_venezuela"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proveedores_id_estatus_fkey"
            columns: ["id_estatus"]
            isOneToOne: false
            referencedRelation: "conf_estatus"
            referencedColumns: ["id"]
          },
        ]
      }
      puestos_empleados: {
        Row: {
          cargo: string | null
          id: number
          id_departamento: number | null
          id_empleado: number | null
        }
        Insert: {
          cargo?: string | null
          id?: number
          id_departamento?: number | null
          id_empleado?: number | null
        }
        Update: {
          cargo?: string | null
          id?: number
          id_departamento?: number | null
          id_empleado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "puestos_empleados_id_departamento_fkey"
            columns: ["id_departamento"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "puestos_empleados_id_empleado_fkey"
            columns: ["id_empleado"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "puestos_empleados_id_empleado_fkey"
            columns: ["id_empleado"]
            isOneToOne: false
            referencedRelation: "v_notify_permission_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "puestos_empleados_id_empleado_fkey"
            columns: ["id_empleado"]
            isOneToOne: false
            referencedRelation: "v_osi_app_role_members"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      requisiciones: {
        Row: {
          acuse_recibido: boolean | null
          acuse_recibido_at: string | null
          acuse_recibido_por: string | null
          additional_items: Json | null
          aprobador_edito: boolean | null
          aprobador_edito_at: string | null
          aprobador_edito_por: number | null
          banco: string | null
          cant_honorarios: number | null
          cant_impresion: number | null
          cant_informe_final: number | null
          cant_traslado: number | null
          cantidad: number | null
          cedula_facilitador: string | null
          cod_facilitador: number | null
          coordinador_at: string | null
          coordinador_estatus: string | null
          coordinador_por: string | null
          corresponde_a: string | null
          costo_traslado: number | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          departamento: string | null
          dias_traslado: number | null
          estatus_admin: string | null
          facilitador: string | null
          fecha_solicitud: string | null
          gerencia_solicitante: string | null
          honorarios_total: number | null
          id: number
          id_estatus: number | null
          id_osi: number | null
          id_proveedor_sugerido: number | null
          id_sesion: number | null
          impresion_total: number | null
          informe_final_total: number | null
          item_solicitado: string | null
          lider_at: string | null
          lider_estatus: string | null
          lider_por: number | null
          motivo_rechazo: string | null
          motivo_rechazo_coordinador: string | null
          motivo_rechazo_lider: string | null
          nro_correlativo: string | null
          nro_cuenta: string | null
          observaciones_compras: string | null
          original_snapshot: Json | null
          osi_fixed_items: Json | null
          prioridad: string | null
          procesada_at: string | null
          procesada_por: string | null
          rif_facilitador: string | null
          solicitante: string | null
          tasa_cambio: number | null
          tasa_cambio_at: string | null
          telefono_facilitador: string | null
          tipo_servicio: string | null
          tipo_solicitud: string | null
          updated_by: string | null
        }
        Insert: {
          acuse_recibido?: boolean | null
          acuse_recibido_at?: string | null
          acuse_recibido_por?: string | null
          additional_items?: Json | null
          aprobador_edito?: boolean | null
          aprobador_edito_at?: string | null
          aprobador_edito_por?: number | null
          banco?: string | null
          cant_honorarios?: number | null
          cant_impresion?: number | null
          cant_informe_final?: number | null
          cant_traslado?: number | null
          cantidad?: number | null
          cedula_facilitador?: string | null
          cod_facilitador?: number | null
          coordinador_at?: string | null
          coordinador_estatus?: string | null
          coordinador_por?: string | null
          corresponde_a?: string | null
          costo_traslado?: number | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          departamento?: string | null
          dias_traslado?: number | null
          estatus_admin?: string | null
          facilitador?: string | null
          fecha_solicitud?: string | null
          gerencia_solicitante?: string | null
          honorarios_total?: number | null
          id?: number
          id_estatus?: number | null
          id_osi?: number | null
          id_proveedor_sugerido?: number | null
          id_sesion?: number | null
          impresion_total?: number | null
          informe_final_total?: number | null
          item_solicitado?: string | null
          lider_at?: string | null
          lider_estatus?: string | null
          lider_por?: number | null
          motivo_rechazo?: string | null
          motivo_rechazo_coordinador?: string | null
          motivo_rechazo_lider?: string | null
          nro_correlativo?: string | null
          nro_cuenta?: string | null
          observaciones_compras?: string | null
          original_snapshot?: Json | null
          osi_fixed_items?: Json | null
          prioridad?: string | null
          procesada_at?: string | null
          procesada_por?: string | null
          rif_facilitador?: string | null
          solicitante?: string | null
          tasa_cambio?: number | null
          tasa_cambio_at?: string | null
          telefono_facilitador?: string | null
          tipo_servicio?: string | null
          tipo_solicitud?: string | null
          updated_by?: string | null
        }
        Update: {
          acuse_recibido?: boolean | null
          acuse_recibido_at?: string | null
          acuse_recibido_por?: string | null
          additional_items?: Json | null
          aprobador_edito?: boolean | null
          aprobador_edito_at?: string | null
          aprobador_edito_por?: number | null
          banco?: string | null
          cant_honorarios?: number | null
          cant_impresion?: number | null
          cant_informe_final?: number | null
          cant_traslado?: number | null
          cantidad?: number | null
          cedula_facilitador?: string | null
          cod_facilitador?: number | null
          coordinador_at?: string | null
          coordinador_estatus?: string | null
          coordinador_por?: string | null
          corresponde_a?: string | null
          costo_traslado?: number | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          departamento?: string | null
          dias_traslado?: number | null
          estatus_admin?: string | null
          facilitador?: string | null
          fecha_solicitud?: string | null
          gerencia_solicitante?: string | null
          honorarios_total?: number | null
          id?: number
          id_estatus?: number | null
          id_osi?: number | null
          id_proveedor_sugerido?: number | null
          id_sesion?: number | null
          impresion_total?: number | null
          informe_final_total?: number | null
          item_solicitado?: string | null
          lider_at?: string | null
          lider_estatus?: string | null
          lider_por?: number | null
          motivo_rechazo?: string | null
          motivo_rechazo_coordinador?: string | null
          motivo_rechazo_lider?: string | null
          nro_correlativo?: string | null
          nro_cuenta?: string | null
          observaciones_compras?: string | null
          original_snapshot?: Json | null
          osi_fixed_items?: Json | null
          prioridad?: string | null
          procesada_at?: string | null
          procesada_por?: string | null
          rif_facilitador?: string | null
          solicitante?: string | null
          tasa_cambio?: number | null
          tasa_cambio_at?: string | null
          telefono_facilitador?: string | null
          tipo_servicio?: string | null
          tipo_solicitud?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requisiciones_aprobador_edito_por_fkey"
            columns: ["aprobador_edito_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisiciones_aprobador_edito_por_fkey"
            columns: ["aprobador_edito_por"]
            isOneToOne: false
            referencedRelation: "v_notify_permission_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "requisiciones_aprobador_edito_por_fkey"
            columns: ["aprobador_edito_por"]
            isOneToOne: false
            referencedRelation: "v_osi_app_role_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "requisiciones_cod_facilitador_fkey"
            columns: ["cod_facilitador"]
            isOneToOne: false
            referencedRelation: "facilitadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisiciones_id_estatus_fkey"
            columns: ["id_estatus"]
            isOneToOne: false
            referencedRelation: "conf_estatus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisiciones_id_osi_fkey"
            columns: ["id_osi"]
            isOneToOne: false
            referencedRelation: "ejecucion_osi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisiciones_id_osi_fkey"
            columns: ["id_osi"]
            isOneToOne: false
            referencedRelation: "v_osi_formato_completo"
            referencedColumns: ["id_osi"]
          },
          {
            foreignKeyName: "requisiciones_id_osi_fkey"
            columns: ["id_osi"]
            isOneToOne: false
            referencedRelation: "v_osi_lista"
            referencedColumns: ["id_osi"]
          },
          {
            foreignKeyName: "requisiciones_id_proveedor_sugerido_fkey"
            columns: ["id_proveedor_sugerido"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
        ]
      }
      requisiciones_osis: {
        Row: {
          created_at: string | null
          id: number
          id_osi: number
          id_requisicion: number
        }
        Insert: {
          created_at?: string | null
          id?: number
          id_osi: number
          id_requisicion: number
        }
        Update: {
          created_at?: string | null
          id?: number
          id_osi?: number
          id_requisicion?: number
        }
        Relationships: [
          {
            foreignKeyName: "requisiciones_osis_id_requisicion_fkey"
            columns: ["id_requisicion"]
            isOneToOne: false
            referencedRelation: "requisiciones"
            referencedColumns: ["id"]
          },
        ]
      }
      rr_ejecutivos_pool: {
        Row: {
          created_at: string
          esta_activo: boolean
          id: number
          prioridad: number
          usuario_id: number
        }
        Insert: {
          created_at?: string
          esta_activo?: boolean
          id?: number
          prioridad?: number
          usuario_id: number
        }
        Update: {
          created_at?: string
          esta_activo?: boolean
          id?: number
          prioridad?: number
          usuario_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "rr_ejecutivos_pool_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: true
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rr_ejecutivos_pool_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: true
            referencedRelation: "v_notify_permission_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "rr_ejecutivos_pool_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: true
            referencedRelation: "v_osi_app_role_members"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      scheduled_notifications: {
        Row: {
          body: string
          context_id: number | null
          context_type: string | null
          created_at: string
          created_by_user_id: number
          error_message: string | null
          id: number
          link_path: string | null
          meta: Json
          notify_at: string
          notify_inbox_id: string | null
          policy: string
          recipient_user_id: number
          sent_at: string | null
          status: string
          target_id: number
          target_type: string
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          context_id?: number | null
          context_type?: string | null
          created_at?: string
          created_by_user_id: number
          error_message?: string | null
          id?: number
          link_path?: string | null
          meta?: Json
          notify_at: string
          notify_inbox_id?: string | null
          policy?: string
          recipient_user_id: number
          sent_at?: string | null
          status?: string
          target_id: number
          target_type: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          context_id?: number | null
          context_type?: string | null
          created_at?: string
          created_by_user_id?: number
          error_message?: string | null
          id?: number
          link_path?: string | null
          meta?: Json
          notify_at?: string
          notify_inbox_id?: string | null
          policy?: string
          recipient_user_id?: number
          sent_at?: string | null
          status?: string
          target_id?: number
          target_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_notifications_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_notifications_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "v_notify_permission_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "scheduled_notifications_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "v_osi_app_role_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "scheduled_notifications_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_notifications_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "v_notify_permission_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "scheduled_notifications_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "v_osi_app_role_members"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      servicio_modalidades_permitidas: {
        Row: {
          id_modalidad: number
          id_servicio: number
        }
        Insert: {
          id_modalidad: number
          id_servicio: number
        }
        Update: {
          id_modalidad?: number
          id_servicio?: number
        }
        Relationships: [
          {
            foreignKeyName: "servicio_modalidades_permitidas_id_modalidad_fkey"
            columns: ["id_modalidad"]
            isOneToOne: false
            referencedRelation: "modalidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servicio_modalidades_permitidas_id_servicio_fkey"
            columns: ["id_servicio"]
            isOneToOne: false
            referencedRelation: "catalogo_servicios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servicio_modalidades_permitidas_id_servicio_fkey"
            columns: ["id_servicio"]
            isOneToOne: false
            referencedRelation: "v_osi_formato_completo"
            referencedColumns: ["id_servicio"]
          },
        ]
      }
      solicitudes_diseno_servicio: {
        Row: {
          bloque_controles_diseno: Json | null
          bloque_higiene_seguridad_ambiente: Json | null
          bloque_planificacion_factibilidad: Json | null
          bloque_recursos_requisitos: Json | null
          bloque_salidas_diseno: Json | null
          cargo_solicitante: string
          fecha_aprobacion: string | null
          fecha_solicitud: string | null
          id: number
          id_estatus: number
          id_servicio_relacionado: number
          id_solicitante: number
          id_usuario_aprobador: number | null
          nombre_sugerido: string
          objetivo_proposito: string
          observaciones_cierre: string | null
          tipo_solicitud: string
        }
        Insert: {
          bloque_controles_diseno?: Json | null
          bloque_higiene_seguridad_ambiente?: Json | null
          bloque_planificacion_factibilidad?: Json | null
          bloque_recursos_requisitos?: Json | null
          bloque_salidas_diseno?: Json | null
          cargo_solicitante: string
          fecha_aprobacion?: string | null
          fecha_solicitud?: string | null
          id?: number
          id_estatus?: number
          id_servicio_relacionado: number
          id_solicitante: number
          id_usuario_aprobador?: number | null
          nombre_sugerido: string
          objetivo_proposito: string
          observaciones_cierre?: string | null
          tipo_solicitud?: string
        }
        Update: {
          bloque_controles_diseno?: Json | null
          bloque_higiene_seguridad_ambiente?: Json | null
          bloque_planificacion_factibilidad?: Json | null
          bloque_recursos_requisitos?: Json | null
          bloque_salidas_diseno?: Json | null
          cargo_solicitante?: string
          fecha_aprobacion?: string | null
          fecha_solicitud?: string | null
          id?: number
          id_estatus?: number
          id_servicio_relacionado?: number
          id_solicitante?: number
          id_usuario_aprobador?: number | null
          nombre_sugerido?: string
          objetivo_proposito?: string
          observaciones_cierre?: string | null
          tipo_solicitud?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitudes_diseno_servicio_id_estatus_fkey"
            columns: ["id_estatus"]
            isOneToOne: false
            referencedRelation: "conf_estatus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_diseno_servicio_id_servicio_relacionado_fkey"
            columns: ["id_servicio_relacionado"]
            isOneToOne: false
            referencedRelation: "catalogo_servicios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_diseno_servicio_id_servicio_relacionado_fkey"
            columns: ["id_servicio_relacionado"]
            isOneToOne: false
            referencedRelation: "v_osi_formato_completo"
            referencedColumns: ["id_servicio"]
          },
          {
            foreignKeyName: "solicitudes_diseno_servicio_id_solicitante_fkey"
            columns: ["id_solicitante"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_diseno_servicio_id_solicitante_fkey"
            columns: ["id_solicitante"]
            isOneToOne: false
            referencedRelation: "v_notify_permission_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "solicitudes_diseno_servicio_id_solicitante_fkey"
            columns: ["id_solicitante"]
            isOneToOne: false
            referencedRelation: "v_osi_app_role_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "solicitudes_diseno_servicio_id_usuario_aprobador_fkey"
            columns: ["id_usuario_aprobador"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_diseno_servicio_id_usuario_aprobador_fkey"
            columns: ["id_usuario_aprobador"]
            isOneToOne: false
            referencedRelation: "v_notify_permission_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "solicitudes_diseno_servicio_id_usuario_aprobador_fkey"
            columns: ["id_usuario_aprobador"]
            isOneToOne: false
            referencedRelation: "v_osi_app_role_members"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      suplencias_ejecutivos: {
        Row: {
          created_at: string
          created_by_usuario_id: number | null
          esta_activa: boolean
          fecha_fin: string
          fecha_inicio: string
          id: number
          id_ejecutivo_suplente: number
          id_ejecutivo_titular: number
        }
        Insert: {
          created_at?: string
          created_by_usuario_id?: number | null
          esta_activa?: boolean
          fecha_fin: string
          fecha_inicio: string
          id?: number
          id_ejecutivo_suplente: number
          id_ejecutivo_titular: number
        }
        Update: {
          created_at?: string
          created_by_usuario_id?: number | null
          esta_activa?: boolean
          fecha_fin?: string
          fecha_inicio?: string
          id?: number
          id_ejecutivo_suplente?: number
          id_ejecutivo_titular?: number
        }
        Relationships: [
          {
            foreignKeyName: "suplencias_ejecutivos_created_by_usuario_id_fkey"
            columns: ["created_by_usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suplencias_ejecutivos_created_by_usuario_id_fkey"
            columns: ["created_by_usuario_id"]
            isOneToOne: false
            referencedRelation: "v_notify_permission_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "suplencias_ejecutivos_created_by_usuario_id_fkey"
            columns: ["created_by_usuario_id"]
            isOneToOne: false
            referencedRelation: "v_osi_app_role_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "suplencias_ejecutivos_id_ejecutivo_suplente_fkey"
            columns: ["id_ejecutivo_suplente"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suplencias_ejecutivos_id_ejecutivo_suplente_fkey"
            columns: ["id_ejecutivo_suplente"]
            isOneToOne: false
            referencedRelation: "v_notify_permission_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "suplencias_ejecutivos_id_ejecutivo_suplente_fkey"
            columns: ["id_ejecutivo_suplente"]
            isOneToOne: false
            referencedRelation: "v_osi_app_role_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "suplencias_ejecutivos_id_ejecutivo_titular_fkey"
            columns: ["id_ejecutivo_titular"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suplencias_ejecutivos_id_ejecutivo_titular_fkey"
            columns: ["id_ejecutivo_titular"]
            isOneToOne: false
            referencedRelation: "v_notify_permission_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "suplencias_ejecutivos_id_ejecutivo_titular_fkey"
            columns: ["id_ejecutivo_titular"]
            isOneToOne: false
            referencedRelation: "v_osi_app_role_members"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      tareas_contexto: {
        Row: {
          assigned_user_id: number | null
          batch_meta: Json
          categoria: string
          completed_at: string | null
          completed_by_user_id: number | null
          context_id: number | null
          context_type: string | null
          created_at: string
          created_by_user_id: number
          descripcion: string | null
          due_date: string | null
          id: number
          is_system: boolean
          priority: string
          related_entity_id: number | null
          related_entity_type: string | null
          related_service_id: number | null
          status: string
          system_kind: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          assigned_user_id?: number | null
          batch_meta?: Json
          categoria?: string
          completed_at?: string | null
          completed_by_user_id?: number | null
          context_id?: number | null
          context_type?: string | null
          created_at?: string
          created_by_user_id: number
          descripcion?: string | null
          due_date?: string | null
          id?: number
          is_system?: boolean
          priority?: string
          related_entity_id?: number | null
          related_entity_type?: string | null
          related_service_id?: number | null
          status?: string
          system_kind?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          assigned_user_id?: number | null
          batch_meta?: Json
          categoria?: string
          completed_at?: string | null
          completed_by_user_id?: number | null
          context_id?: number | null
          context_type?: string | null
          created_at?: string
          created_by_user_id?: number
          descripcion?: string | null
          due_date?: string | null
          id?: number
          is_system?: boolean
          priority?: string
          related_entity_id?: number | null
          related_entity_type?: string | null
          related_service_id?: number | null
          status?: string
          system_kind?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tareas_contexto_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tareas_contexto_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "v_notify_permission_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "tareas_contexto_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "v_osi_app_role_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "tareas_contexto_completed_by_user_id_fkey"
            columns: ["completed_by_user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tareas_contexto_completed_by_user_id_fkey"
            columns: ["completed_by_user_id"]
            isOneToOne: false
            referencedRelation: "v_notify_permission_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "tareas_contexto_completed_by_user_id_fkey"
            columns: ["completed_by_user_id"]
            isOneToOne: false
            referencedRelation: "v_osi_app_role_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "tareas_contexto_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tareas_contexto_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "v_notify_permission_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "tareas_contexto_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "v_osi_app_role_members"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      tareas_sistema_queue: {
        Row: {
          assigned_user_id: number | null
          categoria: string
          created_at: string
          dedupe_key: string
          description: string | null
          due_date: string | null
          error_message: string | null
          id: number
          payload: Json
          presupuesto_id: number | null
          processed_at: string | null
          related_trato_id: number | null
          run_at: string
          status: string
          system_kind: string
          title: string
          trigger_type: string
        }
        Insert: {
          assigned_user_id?: number | null
          categoria: string
          created_at?: string
          dedupe_key: string
          description?: string | null
          due_date?: string | null
          error_message?: string | null
          id?: number
          payload?: Json
          presupuesto_id?: number | null
          processed_at?: string | null
          related_trato_id?: number | null
          run_at: string
          status?: string
          system_kind?: string
          title: string
          trigger_type: string
        }
        Update: {
          assigned_user_id?: number | null
          categoria?: string
          created_at?: string
          dedupe_key?: string
          description?: string | null
          due_date?: string | null
          error_message?: string | null
          id?: number
          payload?: Json
          presupuesto_id?: number | null
          processed_at?: string | null
          related_trato_id?: number | null
          run_at?: string
          status?: string
          system_kind?: string
          title?: string
          trigger_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "tareas_sistema_queue_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tareas_sistema_queue_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "v_notify_permission_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "tareas_sistema_queue_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "v_osi_app_role_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "tareas_sistema_queue_presupuesto_id_fkey"
            columns: ["presupuesto_id"]
            isOneToOne: false
            referencedRelation: "presupuestos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tareas_sistema_queue_related_trato_id_fkey"
            columns: ["related_trato_id"]
            isOneToOne: false
            referencedRelation: "tratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tareas_sistema_queue_related_trato_id_fkey"
            columns: ["related_trato_id"]
            isOneToOne: false
            referencedRelation: "v_ecc_preview_context"
            referencedColumns: ["trato_table_id"]
          },
          {
            foreignKeyName: "tareas_sistema_queue_related_trato_id_fkey"
            columns: ["related_trato_id"]
            isOneToOne: false
            referencedRelation: "v_funnel_comercial_detallado"
            referencedColumns: ["trato_id"]
          },
        ]
      }
      tareas_sistema_reglas: {
        Row: {
          assignee_role_slugs: string[]
          assignee_strategy: string
          assignee_user_id: number | null
          assignee_user_ids: number[]
          created_at: string
          created_by_user_id: number | null
          default_priority: string
          default_status: string
          delay_days: number
          id: number
          is_active: boolean
          link_trigger_entity: boolean
          notify_offset_minutes: number
          offset_mode: string
          rule_name: string
          schedule_time: string | null
          schedule_weekday: number | null
          task_description: string | null
          task_title: string
          trigger_entity: string
          trigger_type: string
          updated_at: string
        }
        Insert: {
          assignee_role_slugs?: string[]
          assignee_strategy?: string
          assignee_user_id?: number | null
          assignee_user_ids?: number[]
          created_at?: string
          created_by_user_id?: number | null
          default_priority?: string
          default_status?: string
          delay_days?: number
          id?: number
          is_active?: boolean
          link_trigger_entity?: boolean
          notify_offset_minutes?: number
          offset_mode?: string
          rule_name: string
          schedule_time?: string | null
          schedule_weekday?: number | null
          task_description?: string | null
          task_title: string
          trigger_entity: string
          trigger_type: string
          updated_at?: string
        }
        Update: {
          assignee_role_slugs?: string[]
          assignee_strategy?: string
          assignee_user_id?: number | null
          assignee_user_ids?: number[]
          created_at?: string
          created_by_user_id?: number | null
          default_priority?: string
          default_status?: string
          delay_days?: number
          id?: number
          is_active?: boolean
          link_trigger_entity?: boolean
          notify_offset_minutes?: number
          offset_mode?: string
          rule_name?: string
          schedule_time?: string | null
          schedule_weekday?: number | null
          task_description?: string | null
          task_title?: string
          trigger_entity?: string
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tareas_sistema_reglas_assignee_user_id_fkey"
            columns: ["assignee_user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tareas_sistema_reglas_assignee_user_id_fkey"
            columns: ["assignee_user_id"]
            isOneToOne: false
            referencedRelation: "v_notify_permission_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "tareas_sistema_reglas_assignee_user_id_fkey"
            columns: ["assignee_user_id"]
            isOneToOne: false
            referencedRelation: "v_osi_app_role_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "tareas_sistema_reglas_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tareas_sistema_reglas_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "v_notify_permission_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "tareas_sistema_reglas_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "v_osi_app_role_members"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      tipo_servicio: {
        Row: {
          id: number
          nombre: string
        }
        Insert: {
          id?: number
          nombre: string
        }
        Update: {
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      tratos: {
        Row: {
          condicion_pago: string | null
          created_at: string
          fecha_creacion: string | null
          id: number
          id_contacto: number
          id_ejecutivo_responsable: number | null
          id_empresa: number | null
          id_estatus: number | null
          id_sede: number | null
          monto_estimado: number | null
          resultado_atencion: string | null
          status_changed_at: string | null
          tipo_participante: string | null
          updated_at: string
        }
        Insert: {
          condicion_pago?: string | null
          created_at?: string
          fecha_creacion?: string | null
          id?: number
          id_contacto: number
          id_ejecutivo_responsable?: number | null
          id_empresa?: number | null
          id_estatus?: number | null
          id_sede?: number | null
          monto_estimado?: number | null
          resultado_atencion?: string | null
          status_changed_at?: string | null
          tipo_participante?: string | null
          updated_at?: string
        }
        Update: {
          condicion_pago?: string | null
          created_at?: string
          fecha_creacion?: string | null
          id?: number
          id_contacto?: number
          id_ejecutivo_responsable?: number | null
          id_empresa?: number | null
          id_estatus?: number | null
          id_sede?: number | null
          monto_estimado?: number | null
          resultado_atencion?: string | null
          status_changed_at?: string | null
          tipo_participante?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tratos_id_contacto_fkey"
            columns: ["id_contacto"]
            isOneToOne: false
            referencedRelation: "contactos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tratos_id_empleado_atiende_fkey"
            columns: ["id_ejecutivo_responsable"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tratos_id_empleado_atiende_fkey"
            columns: ["id_ejecutivo_responsable"]
            isOneToOne: false
            referencedRelation: "v_notify_permission_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "tratos_id_empleado_atiende_fkey"
            columns: ["id_ejecutivo_responsable"]
            isOneToOne: false
            referencedRelation: "v_osi_app_role_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "tratos_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tratos_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "v_osi_formato_completo"
            referencedColumns: ["id_empresa"]
          },
          {
            foreignKeyName: "tratos_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "v_osi_lista"
            referencedColumns: ["id_empresa"]
          },
          {
            foreignKeyName: "tratos_id_estatus_fkey"
            columns: ["id_estatus"]
            isOneToOne: false
            referencedRelation: "conf_estatus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tratos_id_sede_fkey"
            columns: ["id_sede"]
            isOneToOne: false
            referencedRelation: "empresa_sedes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tratos_id_sede_fkey"
            columns: ["id_sede"]
            isOneToOne: false
            referencedRelation: "v_osi_formato_completo"
            referencedColumns: ["id_sede"]
          },
        ]
      }
      unidades_servidor: {
        Row: {
          actualizado_en: string
          creado_en: string
          descripcion: string | null
          id: number
          letra_unidad: string
          nombre_servidor: string
          nombre_visual: string | null
        }
        Insert: {
          actualizado_en?: string
          creado_en?: string
          descripcion?: string | null
          id?: number
          letra_unidad: string
          nombre_servidor: string
          nombre_visual?: string | null
        }
        Update: {
          actualizado_en?: string
          creado_en?: string
          descripcion?: string | null
          id?: number
          letra_unidad?: string
          nombre_servidor?: string
          nombre_visual?: string | null
        }
        Relationships: []
      }
      usuarios: {
        Row: {
          cargo: string | null
          cedula: string | null
          departamento: number | null
          email_corporativo: string | null
          esta_activo: boolean | null
          id: number
          id_auth: string | null
          nombre_apellido: string
          telefono: string | null
        }
        Insert: {
          cargo?: string | null
          cedula?: string | null
          departamento?: number | null
          email_corporativo?: string | null
          esta_activo?: boolean | null
          id?: number
          id_auth?: string | null
          nombre_apellido: string
          telefono?: string | null
        }
        Update: {
          cargo?: string | null
          cedula?: string | null
          departamento?: number | null
          email_corporativo?: string | null
          esta_activo?: boolean | null
          id?: number
          id_auth?: string | null
          nombre_apellido?: string
          telefono?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_departamento_fkey"
            columns: ["departamento"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios_unidades: {
        Row: {
          creado_en: string
          id: number
          nivel_permiso: string | null
          solo_lectura: boolean | null
          unidad_servidor_id: number
          usuario_id: number
        }
        Insert: {
          creado_en?: string
          id?: number
          nivel_permiso?: string | null
          solo_lectura?: boolean | null
          unidad_servidor_id: number
          usuario_id: number
        }
        Update: {
          creado_en?: string
          id?: number
          nivel_permiso?: string | null
          solo_lectura?: boolean | null
          unidad_servidor_id?: number
          usuario_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_usuarios_unidades_unidad"
            columns: ["unidad_servidor_id"]
            isOneToOne: false
            referencedRelation: "unidades_servidor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_usuarios_unidades_usuario"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_usuarios_unidades_usuario"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "v_notify_permission_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "fk_usuarios_unidades_usuario"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "v_osi_app_role_members"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      viaticos_detalles: {
        Row: {
          concepto: string | null
          fecha_gasto: string | null
          id: number
          id_empleado_gasto: number | null
          id_viatico_enc: number | null
          monto_gasto: number
          nro_factura: string | null
          soporte_digital_url: string | null
        }
        Insert: {
          concepto?: string | null
          fecha_gasto?: string | null
          id?: number
          id_empleado_gasto?: number | null
          id_viatico_enc?: number | null
          monto_gasto: number
          nro_factura?: string | null
          soporte_digital_url?: string | null
        }
        Update: {
          concepto?: string | null
          fecha_gasto?: string | null
          id?: number
          id_empleado_gasto?: number | null
          id_viatico_enc?: number | null
          monto_gasto?: number
          nro_factura?: string | null
          soporte_digital_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "viaticos_detalles_id_empleado_gasto_fkey"
            columns: ["id_empleado_gasto"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viaticos_detalles_id_empleado_gasto_fkey"
            columns: ["id_empleado_gasto"]
            isOneToOne: false
            referencedRelation: "v_notify_permission_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "viaticos_detalles_id_empleado_gasto_fkey"
            columns: ["id_empleado_gasto"]
            isOneToOne: false
            referencedRelation: "v_osi_app_role_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "viaticos_detalles_id_viatico_enc_fkey"
            columns: ["id_viatico_enc"]
            isOneToOne: false
            referencedRelation: "viaticos_encabezado"
            referencedColumns: ["id"]
          },
        ]
      }
      viaticos_encabezado: {
        Row: {
          diferencia_reembolso: number | null
          fecha_ida: string | null
          fecha_retorno: string | null
          fecha_solicitud: string | null
          id: number
          id_autorizado_por: number | null
          id_departamento: number | null
          id_elaborado_por: number | null
          id_estatus: number | null
          id_osi: number | null
          id_responsable_pago: number | null
          motivo_viaje: string | null
          observaciones: string | null
          total_consumido: number | null
          total_recibido: number | null
        }
        Insert: {
          diferencia_reembolso?: number | null
          fecha_ida?: string | null
          fecha_retorno?: string | null
          fecha_solicitud?: string | null
          id?: number
          id_autorizado_por?: number | null
          id_departamento?: number | null
          id_elaborado_por?: number | null
          id_estatus?: number | null
          id_osi?: number | null
          id_responsable_pago?: number | null
          motivo_viaje?: string | null
          observaciones?: string | null
          total_consumido?: number | null
          total_recibido?: number | null
        }
        Update: {
          diferencia_reembolso?: number | null
          fecha_ida?: string | null
          fecha_retorno?: string | null
          fecha_solicitud?: string | null
          id?: number
          id_autorizado_por?: number | null
          id_departamento?: number | null
          id_elaborado_por?: number | null
          id_estatus?: number | null
          id_osi?: number | null
          id_responsable_pago?: number | null
          motivo_viaje?: string | null
          observaciones?: string | null
          total_consumido?: number | null
          total_recibido?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "viaticos_encabezado_id_autorizado_por_fkey"
            columns: ["id_autorizado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viaticos_encabezado_id_autorizado_por_fkey"
            columns: ["id_autorizado_por"]
            isOneToOne: false
            referencedRelation: "v_notify_permission_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "viaticos_encabezado_id_autorizado_por_fkey"
            columns: ["id_autorizado_por"]
            isOneToOne: false
            referencedRelation: "v_osi_app_role_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "viaticos_encabezado_id_departamento_fkey"
            columns: ["id_departamento"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viaticos_encabezado_id_elaborado_por_fkey"
            columns: ["id_elaborado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viaticos_encabezado_id_elaborado_por_fkey"
            columns: ["id_elaborado_por"]
            isOneToOne: false
            referencedRelation: "v_notify_permission_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "viaticos_encabezado_id_elaborado_por_fkey"
            columns: ["id_elaborado_por"]
            isOneToOne: false
            referencedRelation: "v_osi_app_role_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "viaticos_encabezado_id_estatus_fkey"
            columns: ["id_estatus"]
            isOneToOne: false
            referencedRelation: "conf_estatus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viaticos_encabezado_id_osi_fkey"
            columns: ["id_osi"]
            isOneToOne: false
            referencedRelation: "ejecucion_osi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viaticos_encabezado_id_osi_fkey"
            columns: ["id_osi"]
            isOneToOne: false
            referencedRelation: "v_osi_formato_completo"
            referencedColumns: ["id_osi"]
          },
          {
            foreignKeyName: "viaticos_encabezado_id_osi_fkey"
            columns: ["id_osi"]
            isOneToOne: false
            referencedRelation: "v_osi_lista"
            referencedColumns: ["id_osi"]
          },
          {
            foreignKeyName: "viaticos_encabezado_id_responsable_pago_fkey"
            columns: ["id_responsable_pago"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viaticos_encabezado_id_responsable_pago_fkey"
            columns: ["id_responsable_pago"]
            isOneToOne: false
            referencedRelation: "v_notify_permission_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "viaticos_encabezado_id_responsable_pago_fkey"
            columns: ["id_responsable_pago"]
            isOneToOne: false
            referencedRelation: "v_osi_app_role_members"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      viaticos_participantes: {
        Row: {
          id_empleado: number
          id_viatico_enc: number
        }
        Insert: {
          id_empleado: number
          id_viatico_enc: number
        }
        Update: {
          id_empleado?: number
          id_viatico_enc?: number
        }
        Relationships: [
          {
            foreignKeyName: "viaticos_participantes_id_empleado_fkey"
            columns: ["id_empleado"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viaticos_participantes_id_empleado_fkey"
            columns: ["id_empleado"]
            isOneToOne: false
            referencedRelation: "v_notify_permission_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "viaticos_participantes_id_empleado_fkey"
            columns: ["id_empleado"]
            isOneToOne: false
            referencedRelation: "v_osi_app_role_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "viaticos_participantes_id_viatico_enc_fkey"
            columns: ["id_viatico_enc"]
            isOneToOne: false
            referencedRelation: "viaticos_encabezado"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      analytics_metrics: {
        Row: {
          active_carnets: number | null
          active_certificates: number | null
          average_score: number | null
          carnets_this_month: number | null
          carnets_this_year: number | null
          cedula_e_count: number | null
          cedula_v_count: number | null
          certificates_by_state: Json | null
          certificates_this_month: number | null
          certificates_this_year: number | null
          expiration_timeline: Json | null
          expired_carnets: number | null
          expired_certificates: number | null
          foreign_count: number | null
          inactive_carnets: number | null
          inactive_certificates: number | null
          last_updated: string | null
          max_score: number | null
          min_score: number | null
          monthly_emissions: Json | null
          no_expiration_certificates: number | null
          top_companies: Json | null
          top_courses: Json | null
          top_facilitators: Json | null
          total_carnets: number | null
          total_certificates: number | null
          total_participants: number | null
          unique_companies_with_carnets: number | null
          unique_companies_with_certificates: number | null
          unique_courses_with_carnets: number | null
          unique_courses_with_certificates: number | null
          unique_facilitators_with_certificates: number | null
          unique_nationalities: number | null
          unique_osis_with_carnets: number | null
          unique_participants_with_carnets: number | null
          unique_participants_with_certificates: number | null
          unique_states_with_certificates: number | null
          valid_carnets: number | null
          valid_certificates: number | null
          venezuelan_count: number | null
        }
        Relationships: []
      }
      v_ecc_detalle_legible: {
        Row: {
          aplica: boolean | null
          cantidad: number | null
          categoria_costo: string | null
          concepto: string | null
          costo_aplicado: number | null
          id_ecc: number | null
          id_trato: number | null
          linea_id: number | null
          precio_venta_sugerido: number | null
          subtotal_real: number | null
          unidad_medida: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ecc_detalle_lineas_id_ecc_fkey"
            columns: ["id_ecc"]
            isOneToOne: false
            referencedRelation: "ecc_encabezado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecc_detalle_lineas_id_ecc_fkey"
            columns: ["id_ecc"]
            isOneToOne: false
            referencedRelation: "v_ecc_preview_context"
            referencedColumns: ["ecc_id"]
          },
          {
            foreignKeyName: "ecc_detalle_lineas_id_ecc_fkey"
            columns: ["id_ecc"]
            isOneToOne: false
            referencedRelation: "v_ecc_resumen"
            referencedColumns: ["id_ecc"]
          },
          {
            foreignKeyName: "ecc_detalle_lineas_id_ecc_fkey"
            columns: ["id_ecc"]
            isOneToOne: false
            referencedRelation: "v_funnel_comercial_detallado"
            referencedColumns: ["ecc_id"]
          },
          {
            foreignKeyName: "ecc_encabezado_id_trato_fkey"
            columns: ["id_trato"]
            isOneToOne: false
            referencedRelation: "tratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecc_encabezado_id_trato_fkey"
            columns: ["id_trato"]
            isOneToOne: false
            referencedRelation: "v_ecc_preview_context"
            referencedColumns: ["trato_table_id"]
          },
          {
            foreignKeyName: "ecc_encabezado_id_trato_fkey"
            columns: ["id_trato"]
            isOneToOne: false
            referencedRelation: "v_funnel_comercial_detallado"
            referencedColumns: ["trato_id"]
          },
        ]
      }
      v_ecc_preview_context: {
        Row: {
          contacto_apellido: string | null
          contacto_nombre: string | null
          ecc_id: number | null
          ejecutivo_nombre_apellido: string | null
          empresa_razon_social: string | null
          id_contacto: number | null
          id_empresa: number | null
          id_estatus: number | null
          id_servicio: number | null
          id_trato: number | null
          trato_ejecutivo_id: number | null
          trato_table_id: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ecc_encabezado_id_estatus_fkey"
            columns: ["id_estatus"]
            isOneToOne: false
            referencedRelation: "conf_estatus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecc_encabezado_id_servicio_fkey"
            columns: ["id_servicio"]
            isOneToOne: false
            referencedRelation: "catalogo_servicios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecc_encabezado_id_servicio_fkey"
            columns: ["id_servicio"]
            isOneToOne: false
            referencedRelation: "v_osi_formato_completo"
            referencedColumns: ["id_servicio"]
          },
          {
            foreignKeyName: "ecc_encabezado_id_trato_fkey"
            columns: ["id_trato"]
            isOneToOne: false
            referencedRelation: "tratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecc_encabezado_id_trato_fkey"
            columns: ["id_trato"]
            isOneToOne: false
            referencedRelation: "v_ecc_preview_context"
            referencedColumns: ["trato_table_id"]
          },
          {
            foreignKeyName: "ecc_encabezado_id_trato_fkey"
            columns: ["id_trato"]
            isOneToOne: false
            referencedRelation: "v_funnel_comercial_detallado"
            referencedColumns: ["trato_id"]
          },
          {
            foreignKeyName: "tratos_id_contacto_fkey"
            columns: ["id_contacto"]
            isOneToOne: false
            referencedRelation: "contactos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tratos_id_empleado_atiende_fkey"
            columns: ["trato_ejecutivo_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tratos_id_empleado_atiende_fkey"
            columns: ["trato_ejecutivo_id"]
            isOneToOne: false
            referencedRelation: "v_notify_permission_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "tratos_id_empleado_atiende_fkey"
            columns: ["trato_ejecutivo_id"]
            isOneToOne: false
            referencedRelation: "v_osi_app_role_members"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "tratos_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tratos_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "v_osi_formato_completo"
            referencedColumns: ["id_empresa"]
          },
          {
            foreignKeyName: "tratos_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "v_osi_lista"
            referencedColumns: ["id_empresa"]
          },
        ]
      }
      v_ecc_resumen: {
        Row: {
          estatus: string | null
          horas_totales: number | null
          id_ecc: number | null
          monto_gastos_admin: number | null
          monto_utilidad: number | null
          participantes: number | null
          precio_por_persona: number | null
          subtotal_costos_directos: number | null
          total_general: number | null
        }
        Relationships: []
      }
      v_funnel_comercial_detallado: {
        Row: {
          cliente: string | null
          dias_lead_a_trato: number | null
          dias_trato_a_ecc: number | null
          ecc_id: number | null
          estatus_trato: string | null
          fecha_aprobacion_ecc: string | null
          fecha_creacion_trato: string | null
          fecha_emision_presupuesto: string | null
          fecha_registro_lead: string | null
          lead_id: number | null
          lead_nombre: string | null
          monto_item_presupuesto_iva: number | null
          monto_neto_ecc: number | null
          nro_presupuesto: number | null
          servicio_especifico_ecc: string | null
          servicio_trato_referencia: string | null
          tiempo_total_conversion: number | null
          trato_id: number | null
          vencimiento_presupuesto: string | null
        }
        Relationships: []
      }
      v_notify_permission_members: {
        Row: {
          app_slug: string | null
          cargo: string | null
          departamento_id: number | null
          email_corporativo: string | null
          nombre_apellido: string | null
          permission_slug: string | null
          usuario_id: number | null
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_departamento_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      v_notify_permissions_catalog: {
        Row: {
          descripcion: string | null
          slug: string | null
        }
        Insert: {
          descripcion?: string | null
          slug?: string | null
        }
        Update: {
          descripcion?: string | null
          slug?: string | null
        }
        Relationships: []
      }
      v_osi_app_role_members: {
        Row: {
          app_slug: string | null
          cargo: string | null
          departamento_id: number | null
          email_corporativo: string | null
          nombre_apellido: string | null
          role_slug: string | null
          usuario_id: number | null
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_departamento_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      v_osi_app_roles_catalog: {
        Row: {
          app_nombre: string | null
          app_slug: string | null
          role_nombre: string | null
          role_slug: string | null
        }
        Relationships: []
      }
      v_osi_formato_completo: {
        Row: {
          bateria_incluida: boolean | null
          cantidad_analistas: number | null
          cantidad_dias_campo: number | null
          cantidad_dias_informe: number | null
          cantidad_dias_revision_interna: number | null
          carnet_impreso: boolean | null
          certificado_impreso: boolean | null
          clase_ecc: string | null
          cliente_rif: string | null
          codigo_cliente: number | null
          contacto_email: string | null
          contacto_telefono: string | null
          contenido_servicio: string | null
          costo_bateria: number | null
          costo_carnetizacion: number | null
          costo_dias_especialista: number | null
          costo_honorarios_instructor: number | null
          costo_hospedaje: number | null
          costo_impresion_material: number | null
          costo_logistica_comida: number | null
          costo_otros: number | null
          costo_pop: number | null
          costo_traslado: number | null
          desglose_recursos_sesiones: Json | null
          dias_hospedaje_facilitador: number | null
          dias_logistica_facilitador: number | null
          direccion_ejecucion: string | null
          direccion_ejecucion_real: string | null
          direccion_envio: string | null
          direccion_fiscal: string | null
          ejecutivo_negocios: string | null
          entrega_certificado: string | null
          fecha_emision: string | null
          fecha_emision_presupuesto: string | null
          fecha_fin_real: string | null
          fecha_firma_administracion: string | null
          fecha_firma_calidad: string | null
          fecha_firma_direccion: string | null
          fecha_firma_negocios: string | null
          fecha_firma_verificacion: string | null
          fecha_inicio_real: string | null
          hora_inicio_servicio: string | null
          horas_academicas_ejecucion: number | null
          horas_academicas_solped: number | null
          horas_honorarios_instructor: number | null
          id_ciudad_direccion_contrato: number | null
          id_ciudad_direccion_ejecucion_efectiva: number | null
          id_direccion_ejecucion_real: number | null
          id_direccion_ejecucion_solped: number | null
          id_ecc_actual: number | null
          id_ecc_origen: number | null
          id_empresa: number | null
          id_estado_direccion_contrato: number | null
          id_estado_direccion_ejecucion_efectiva: number | null
          id_estatus: number | null
          id_osi: number | null
          id_sede: number | null
          id_servicio: number | null
          id_trato: number | null
          impacto_ecc_delta: number | null
          impacto_ecc_en: string | null
          impacto_ecc_pendiente: boolean | null
          impacto_ecc_resuelto_por: string | null
          impresion_material_incluida: boolean | null
          incluye_refrigerio: boolean | null
          nombre_empresa: string | null
          nro_orden_compra: string | null
          nro_osi: string | null
          nro_presupuesto: number | null
          numero_areas: number | null
          numero_puntos_evaluar: number | null
          numero_trabajadores: number | null
          observaciones_totales: string | null
          participantes_ejecucion: number | null
          participantes_max_solped: number | null
          persona_contacto: string | null
          pop_incluido: boolean | null
          pretensiones_totales: string | null
          requiere_audiovisuales: boolean | null
          responsable_recepcion: string | null
          sede: string | null
          servicio: string | null
          sesiones_ejecucion: number | null
          sesiones_programadas: Json | null
          sesiones_solped: number | null
          st_analistas: number | null
          st_dias_campo: number | null
          st_dias_informe: number | null
          st_dias_revision: number | null
          st_envio_factura: number | null
          st_envio_materiales: number | null
          st_logistica_recursos: number | null
          st_otros_texto: string | null
          st_seguimiento_garantia: string | null
          st_traslados: Json | null
          tarifa_hora_honorarios: number | null
          tipo_servicio: string | null
          traslado_externo: number | null
        }
        Relationships: [
          {
            foreignKeyName: "direcciones_cliente_id_ciudad_fkey"
            columns: ["id_ciudad_direccion_contrato"]
            isOneToOne: false
            referencedRelation: "cat_ciudades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direcciones_cliente_id_estado_fkey"
            columns: ["id_estado_direccion_contrato"]
            isOneToOne: false
            referencedRelation: "cat_estados_venezuela"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecc_encabezado_id_direccion_ejecucion_solped_fkey"
            columns: ["id_direccion_ejecucion_solped"]
            isOneToOne: false
            referencedRelation: "direcciones_cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecc_encabezado_id_trato_fkey"
            columns: ["id_trato"]
            isOneToOne: false
            referencedRelation: "tratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecc_encabezado_id_trato_fkey"
            columns: ["id_trato"]
            isOneToOne: false
            referencedRelation: "v_ecc_preview_context"
            referencedColumns: ["trato_table_id"]
          },
          {
            foreignKeyName: "ecc_encabezado_id_trato_fkey"
            columns: ["id_trato"]
            isOneToOne: false
            referencedRelation: "v_funnel_comercial_detallado"
            referencedColumns: ["trato_id"]
          },
          {
            foreignKeyName: "ejecucion_osi_id_direccion_ejecucion_real_fkey"
            columns: ["id_direccion_ejecucion_real"]
            isOneToOne: false
            referencedRelation: "direcciones_cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ejecucion_osi_id_ecc_fkey"
            columns: ["id_ecc_actual"]
            isOneToOne: false
            referencedRelation: "ecc_encabezado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ejecucion_osi_id_ecc_fkey"
            columns: ["id_ecc_actual"]
            isOneToOne: false
            referencedRelation: "v_ecc_preview_context"
            referencedColumns: ["ecc_id"]
          },
          {
            foreignKeyName: "ejecucion_osi_id_ecc_fkey"
            columns: ["id_ecc_actual"]
            isOneToOne: false
            referencedRelation: "v_ecc_resumen"
            referencedColumns: ["id_ecc"]
          },
          {
            foreignKeyName: "ejecucion_osi_id_ecc_fkey"
            columns: ["id_ecc_actual"]
            isOneToOne: false
            referencedRelation: "v_funnel_comercial_detallado"
            referencedColumns: ["ecc_id"]
          },
          {
            foreignKeyName: "ejecucion_osi_id_estatus_fkey"
            columns: ["id_estatus"]
            isOneToOne: false
            referencedRelation: "conf_estatus"
            referencedColumns: ["id"]
          },
        ]
      }
      v_osi_lista: {
        Row: {
          codigo_cliente: number | null
          direccion_ejecucion: string | null
          ejecutivo_negocios: string | null
          fecha_emision: string | null
          fecha_fin_real: string | null
          fecha_inicio_real: string | null
          horas_academicas_ejecucion: number | null
          id_ciudad_direccion_ejecucion_efectiva: number | null
          id_empresa: number | null
          id_estado_direccion_ejecucion_efectiva: number | null
          id_estatus: number | null
          id_osi: number | null
          nombre_empresa: string | null
          nro_osi: string | null
          participantes_ejecucion: number | null
          participantes_max_solped: number | null
          servicio: string | null
          sesiones_ejecucion: number | null
          tipo_servicio: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ejecucion_osi_id_estatus_fkey"
            columns: ["id_estatus"]
            isOneToOne: false
            referencedRelation: "conf_estatus"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_kpi_presupuestos_base: {
        Row: {
          aprobado_contable_fecha: string | null
          aprobado_flag: boolean | null
          aprobado_por_detalle: boolean | null
          aprobado_por_estatus: boolean | null
          aprobado_por_osi: boolean | null
          comprobante_cuenta_como_venta: boolean | null
          comprobante_tipo_slug: string | null
          descartado_flag: boolean | null
          ejecutivo_id: number | null
          ejecutivo_nombre: string | null
          emitido_base_fecha: string | null
          emitido_contable_fecha: string | null
          evento_at: string | null
          evento_fecha: string | null
          fecha_comprobante: string | null
          fecha_emision: string | null
          fecha_proyectado: string | null
          id_ecc: number | null
          id_estatus: number | null
          id_presupuesto: number | null
          id_trato: number | null
          modo_facturacion: string | null
          monto_linea_completa: number | null
          monto_presupuesto: number | null
          monto_suma_explicacion: string | null
          nro_sesion: number | null
          numero_comprobante: string | null
          proyectado_flag: boolean | null
          sesiones_total: number | null
          tipo_contabilizacion: string | null
          unidad_indicador: string | null
          venta_contable_fecha: string | null
          venta_flag: boolean | null
        }
        Relationships: []
      }
    }
    Functions: {
      append_activity_event: {
        Args: {
          p_actor_user_id: number
          p_context_id: number
          p_context_type: string
          p_documento_ref?: string
          p_empresa_id?: number
          p_payload?: Json
          p_servicio_id?: number
          p_source_id?: string
          p_source_table?: string
          p_tipo_evento: string
        }
        Returns: number
      }
      append_activity_event_empresa_servicio: {
        Args: {
          p_actor_user_id: number
          p_empresa_id: number
          p_payload?: Json
          p_servicio_id: number
          p_source_id?: string
          p_source_table?: string
          p_tipo_evento: string
        }
        Returns: undefined
      }
      append_activity_event_empresa_servicio_trato: {
        Args: {
          p_actor_user_id: number
          p_empresa_id: number
          p_payload?: Json
          p_servicio_id: number
          p_source_id?: string
          p_source_table?: string
          p_tipo_evento: string
          p_trato_id: number
        }
        Returns: undefined
      }
      append_activity_event_solped: {
        Args: {
          p_actor_user_id: number
          p_ecc_id: number
          p_empresa_id: number
          p_payload?: Json
          p_servicio_catalogo_id: number
          p_source_id?: string
          p_source_table?: string
          p_tipo_evento: string
          p_trato_id: number
        }
        Returns: undefined
      }
      backfill_actividad_maestra_all: {
        Args: { p_batch_id?: string }
        Returns: Json
      }
      build_comentario_vinculos_json: {
        Args: { p_comentario_id: number }
        Returns: Json
      }
      can_mutate_contacto: { Args: { p_contacto_id: number }; Returns: boolean }
      can_mutate_empresa: { Args: { p_empresa_id: number }; Returns: boolean }
      can_mutate_marketing_lead: {
        Args: { p_lead_id: number }
        Returns: boolean
      }
      can_mutate_trato: { Args: { p_trato_id: number }; Returns: boolean }
      can_read_comentario_thread: {
        Args: { p_comentario_id: number }
        Returns: boolean
      }
      can_register_marketing_lead_recontacto: {
        Args: { p_lead_id: number }
        Returns: boolean
      }
      create_user_reminder: {
        Args: {
          p_body: string
          p_context_id: number
          p_context_type: string
          p_link_path?: string
          p_metadata?: Json
          p_recipient_user_id: number
          p_remind_at: string
          p_title: string
        }
        Returns: string
      }
      delete_contacto_permanently: {
        Args: {
          p_actor_usuario_id?: number
          p_contacto_id: number
          p_reassign_to_id?: number
        }
        Returns: Json
      }
      derive_contacto_historic_ts: {
        Args: { p_contacto_id: number }
        Returns: string
      }
      dispatch_due_scheduled_notifications: {
        Args: { p_limit?: number }
        Returns: number
      }
      ecc_update_is_status_only: {
        Args: {
          new_row: Database["public"]["Tables"]["ecc_encabezado"]["Row"]
          old_row: Database["public"]["Tables"]["ecc_encabezado"]["Row"]
        }
        Returns: boolean
      }
      fn_agregar_kpis_presupuesto: {
        Args: { p_ejecutivo_id?: number; p_fin: string; p_inicio: string }
        Returns: {
          cantidad_aprobados: number
          cantidad_descartados: number
          cantidad_presupuestos_validos: number
          monto_aprobado: number
          monto_descartado: number
          monto_presupuestado: number
        }[]
      }
      fn_agregar_logro_operativo: {
        Args: { p_fin: string; p_inicio: string }
        Returns: number
      }
      fn_calcular_cadena_metas: {
        Args: {
          p_factor_meta_presupuesto: number
          p_factor_meta_venta: number
          p_meta_presupuesto_override?: number
          p_meta_venta_override?: number
          p_presupuesto_empresa_mensual: number
        }
        Returns: {
          meta_presupuesto_mensual: number
          meta_venta_mensual: number
        }[]
      }
      fn_cerrar_presupuesto_detalles_pendientes: {
        Args: { p_fecha_cierre?: string }
        Returns: number
      }
      fn_dashboard_bucket_ends: {
        Args: {
          p_fecha_corte?: string
          p_fin: string
          p_inicio: string
          p_periodo_tipo: string
        }
        Returns: {
          fecha_fin_bucket: string
          label: string
        }[]
      }
      fn_dias_habiles_mes: { Args: { p_mes: string }; Returns: number }
      fn_dias_habiles_rango: {
        Args: { p_fin: string; p_inicio: string }
        Returns: number
      }
      fn_dias_habiles_semana: { Args: { p_ref: string }; Returns: number }
      fn_dias_habiles_transcurridos: {
        Args: { p_corte: string; p_inicio: string }
        Returns: number
      }
      fn_ensure_dashboard_periodo: {
        Args: {
          p_fecha_fin?: string
          p_fecha_inicio?: string
          p_fecha_referencia?: string
          p_periodo_tipo: string
        }
        Returns: number
      }
      fn_generar_presupuesto_desde_ecc:
        | {
            Args: {
              p_id_banco: number
              p_id_eccs: number[]
              p_solo_previsualizar?: boolean
              p_vigencia_dias?: number
            }
            Returns: {
              descripcion_comercial: string
              id_ecc_ref: number
              id_trato_ref: number
              iva: number
              neto: number
              total_con_iva: number
            }[]
          }
        | {
            Args: {
              p_id_banco: number
              p_id_eccs: number[]
              p_vigencia_dias?: number
            }
            Returns: number
          }
      fn_get_next_lead_owner_round_robin: { Args: never; Returns: number }
      fn_kpi_inspection_rows: {
        Args: { p_fin: string; p_inicio: string }
        Returns: {
          aprobado_contable_fecha: string
          aprobado_flag: boolean
          ejecutivo_id: number
          ejecutivo_nombre: string
          emitido_base_fecha: string
          empresa_nombre: string
          en_listado: boolean
          excluido_por_ecc: boolean
          fecha_emision: string
          fecha_proyectado: string
          id_ecc: number
          id_ecc_madre: number
          id_presupuesto: number
          modo_facturacion: string
          monto_linea_completa: number
          monto_presupuesto: number
          monto_suma_explicacion: string
          nro_sesion: number
          proyectado_flag: boolean
          sede_nombre: string
          servicio_nombre: string
          sesiones_total: number
          unidad_indicador: string
          venta_contable_fecha: string
          venta_flag: boolean
        }[]
      }
      fn_mark_cliente_from_trato: {
        Args: { p_trato_id: number }
        Returns: undefined
      }
      fn_marketing_register_recontacto: {
        Args: {
          p_id_servicio_interes?: number
          p_lead_id: number
          p_marcar_caliente?: boolean
          p_nota?: string
        }
        Returns: Json
      }
      fn_normalize_presupuesto_estatus_id: {
        Args: { p_id_estatus: number }
        Returns: number
      }
      fn_osi_list_app_roles: {
        Args: never
        Returns: {
          app_nombre: string
          app_slug: string
          role_nombre: string
          role_slug: string
        }[]
      }
      fn_periodo_ref_desde_rango: {
        Args: { p_fecha_fin: string; p_fecha_inicio: string }
        Returns: string
      }
      fn_procesar_ecc:
        | {
            Args: { p_id_ecc: number; p_solo_previsualizar?: boolean }
            Returns: {
              cantidad: number
              concepto: string
              costo_unitario: number
              subtotal: number
              tipo_registro: string
            }[]
          }
        | {
            Args: {
              p_id_ecc: number
              p_items_excluidos?: number[]
              p_solo_previsualizar?: boolean
            }
            Returns: {
              aplica: boolean
              cantidad: number
              concepto: string
              costo_unitario: number
              id_item: number
              subtotal: number
              tipo_registro: string
            }[]
          }
        | {
            Args: {
              p_id_ecc: number
              p_items_excluidos?: number[]
              p_reiniciar_desde_catalogo?: boolean
              p_solo_previsualizar?: boolean
            }
            Returns: {
              aplica: boolean
              cantidad: number
              concepto: string
              costo_unitario: number
              id_item: number
              subtotal: number
              tipo_registro: string
            }[]
          }
      fn_rechazar_presupuestos_sin_proyeccion_en_periodo: {
        Args: { p_fecha_fin: string; p_fecha_inicio: string }
        Returns: number
      }
      fn_resolver_meta_periodo: {
        Args: {
          p_ejecutivo_id?: number
          p_fecha_fin?: string
          p_fecha_inicio?: string
          p_fecha_referencia?: string
          p_periodo_tipo: string
        }
        Returns: {
          anio_mes: string
          dias_habiles_mes: number
          dias_habiles_periodo: number
          fecha_corte_efectiva: string
          fecha_fin: string
          fecha_inicio: string
          meta_presupuesto_diaria: number
          meta_presupuesto_mensual: number
          meta_presupuesto_periodo: number
          meta_venta_diaria: number
          meta_venta_mensual: number
          meta_venta_periodo: number
          porcentaje_aprobacion_meta: number
          porcentaje_meta_ejecutivo: number
        }[]
      }
      fn_resolver_periodo_bounds: {
        Args: {
          p_fecha_fin?: string
          p_fecha_inicio?: string
          p_fecha_referencia?: string
          p_periodo_tipo: string
        }
        Returns: {
          etiqueta: string
          fecha_corte_efectiva: string
          fecha_fin: string
          fecha_fin_programada: string
          fecha_inicio: string
        }[]
      }
      fn_sync_osi_dates_from_sessions: {
        Args: { p_id_osi: number }
        Returns: undefined
      }
      fn_tareas_active_rule_id_for_trigger: {
        Args: { p_trigger_type: string }
        Returns: number
      }
      fn_tareas_batch_due_friday_17: {
        Args: { p_reference?: string }
        Returns: string
      }
      fn_tareas_batch_due_from_week_key: {
        Args: { p_week_key: string }
        Returns: string
      }
      fn_tareas_build_decision_batch_semana: {
        Args: { p_reference?: string; p_rule_id?: number }
        Returns: number
      }
      fn_tareas_build_facturacion_batch: {
        Args: { p_reference?: string; p_rule_id?: number }
        Returns: number
      }
      fn_tareas_build_seguimiento_batch: {
        Args: { p_reference?: string; p_rule_id?: number }
        Returns: number
      }
      fn_tareas_build_solped_batch_semana: {
        Args: { p_reference?: string; p_rule_id?: number }
        Returns: number
      }
      fn_tareas_cancel_solicitud_facturas_on_presupuesto: {
        Args: { p_presupuesto_id: number }
        Returns: number
      }
      fn_tareas_create_seguimiento_presupuesto_comentario: {
        Args: {
          p_author_user_id: number
          p_contenido: string
          p_nro_presupuesto?: string
          p_presupuesto_id: number
          p_trato_id: number
        }
        Returns: number
      }
      fn_tareas_decision_done_reason: {
        Args: {
          p_header_status_id: number
          p_header_status_label: string
          p_presupuesto_id: number
        }
        Returns: string
      }
      fn_tareas_dispatch_facturacion_batches: {
        Args: { p_reference?: string }
        Returns: number
      }
      fn_tareas_dispatch_scheduled_batches: {
        Args: { p_reference?: string }
        Returns: number
      }
      fn_tareas_dispatch_seguimiento_batches: {
        Args: { p_reference?: string }
        Returns: number
      }
      fn_tareas_find_analista_ricardo_id: { Args: never; Returns: number }
      fn_tareas_insert_system_task: {
        Args: {
          p_assigned_user_id: number
          p_batch_meta?: Json
          p_categoria: string
          p_context_id: number
          p_context_type: string
          p_created_by_user_id: number
          p_descripcion: string
          p_due_date: string
          p_related_entity_id: number
          p_related_entity_type: string
          p_system_kind: string
          p_titulo: string
        }
        Returns: number
      }
      fn_tareas_is_presupuesto_batch_decidido: {
        Args: { p_presupuesto_id: number }
        Returns: boolean
      }
      fn_tareas_is_presupuesto_decidido_100: {
        Args: { p_presupuesto_id: number }
        Returns: boolean
      }
      fn_tareas_list_sgestion_roles: {
        Args: never
        Returns: {
          nombre: string
          slug: string
        }[]
      }
      fn_tareas_mark_batch_tasks_vencidas: {
        Args: { p_reference?: string }
        Returns: number
      }
      fn_tareas_maybe_create_solicitud_facturas: {
        Args: { p_actor_user_id?: number; p_presupuesto_id: number }
        Returns: number
      }
      fn_tareas_notify_system_task: {
        Args: {
          p_assigned_user_id: number
          p_body?: string
          p_context_id?: number
          p_context_type?: string
          p_meta?: Json
          p_notify_at?: string
          p_task_id: number
          p_titulo: string
        }
        Returns: undefined
      }
      fn_tareas_presupuesto_tiene_osi_ejecutada: {
        Args: { p_presupuesto_id: number }
        Returns: boolean
      }
      fn_tareas_process_system_queue: {
        Args: { p_limit?: number }
        Returns: number
      }
      fn_tareas_queue_followups_lead_recontacto: {
        Args: { p_actor_user_id?: number; p_lead_id: number; p_nota?: string }
        Returns: number
      }
      fn_tareas_queue_followups_presupuesto_emitido: {
        Args: { p_actor_user_id?: number; p_presupuesto_id: number }
        Returns: number
      }
      fn_tareas_recalc_seguimiento_batch_meta: {
        Args: { p_items: Json }
        Returns: Json
      }
      fn_tareas_refresh_decision_batch_progress: {
        Args: { p_presupuesto_id: number }
        Returns: number
      }
      fn_tareas_refresh_facturacion_batch_on_presupuesto: {
        Args: { p_presupuesto_id: number; p_status_id?: number }
        Returns: number
      }
      fn_tareas_refresh_seguimiento_batch_on_presupuesto: {
        Args: { p_presupuesto_id: number; p_status_id?: number }
        Returns: number
      }
      fn_tareas_refresh_solped_batch_progress: {
        Args: { p_ecc_id: number }
        Returns: number
      }
      fn_tareas_resolve_assignees_for_rule: {
        Args: { p_lead_id?: number; p_rule_id: number; p_trato_id?: number }
        Returns: number[]
      }
      fn_tareas_resolve_rule_assignee_ids: {
        Args: { p_rule_id: number }
        Returns: number[]
      }
      fn_tareas_run_rule_now: {
        Args: { p_reference?: string; p_rule_id: number }
        Returns: number
      }
      fn_tareas_solicitar_factura_a_finanzas: {
        Args: {
          p_descripcion: string
          p_presupuesto_id: number
          p_task_id: number
        }
        Returns: Json
      }
      fn_tareas_solped_has_presupuesto_emitido: {
        Args: { p_ecc_id: number }
        Returns: boolean
      }
      fn_tareas_task_link_path: {
        Args: {
          p_context_id?: number
          p_context_type?: string
          p_task_id: number
        }
        Returns: string
      }
      fn_tareas_toggle_seguimiento_item: {
        Args: {
          p_done: boolean
          p_presupuesto_id: number
          p_resultado_notas?: string
          p_task_id: number
        }
        Returns: Json
      }
      fn_tareas_trato_condicion_es_contado: {
        Args: { p_condicion_pago: string }
        Returns: boolean
      }
      fn_tareas_usuarios_by_role_slugs: {
        Args: { p_role_slugs: string[] }
        Returns: number[]
      }
      get_capacitacion_dashboard_counts: {
        Args: { p_first_day_of_month: string }
        Returns: {
          certificados: number
          certificados_mes: number
          cursos_activos: number
          facilitadores: number
          participantes: number
        }[]
      }
      get_certificate_generation_data: {
        Args: never
        Returns: {
          active_carnet_template: Json
          active_certificate_template: Json
          all_carnet_templates: Json
          all_certificate_templates: Json
          courses: Json
          osis: Json
          osis_with_certificates: string[]
          signatures: Json
        }[]
      }
      get_certificate_metrics: {
        Args: {
          p_company_id?: number
          p_course_id?: number
          p_date_from?: string
          p_date_to?: string
          p_is_active?: boolean
          p_search_term?: string
        }
        Returns: Json
      }
      get_comentario_menciones_batch: {
        Args: { p_comment_ids: number[] }
        Returns: {
          comentario_id: number
          mentioned_user_id: number
        }[]
      }
      get_comentario_vinculos_batch: {
        Args: { p_comment_ids: number[] }
        Returns: {
          comentario_id: number
          entity_id: number
          entity_type: string
          service_id: number
          service_name: string
          subtitle: string
        }[]
      }
      get_comentarios_acl_feed: {
        Args: { p_limit?: number }
        Returns: {
          author_user_id: number
          comment_kind: string
          contenido: string
          context_id: number
          context_type: string
          created_at: string
          edited_at: string
          id: number
          related_entity_id: number
          related_entity_type: string
          related_service_id: number
        }[]
      }
      get_comentarios_by_context_acl: {
        Args: { p_context_id: number; p_context_type: string; p_limit?: number }
        Returns: {
          author_user_id: number
          comment_kind: string
          contenido: string
          context_id: number
          context_type: string
          created_at: string
          edited_at: string
          id: number
          related_entity_id: number
          related_entity_type: string
          related_service_id: number
        }[]
      }
      get_comentarios_for_empresa_hub: {
        Args: { p_empresa_id: number; p_limit?: number }
        Returns: {
          author_nombre: string
          author_user_id: number
          comentario_id: number
          comment_kind: string
          contenido: string
          context_id: number
          context_type: string
          created_at: string
          edited_at: string
          vinculos: Json
        }[]
      }
      get_comentarios_vinculados_entidad: {
        Args: { p_entity_id: number; p_entity_type: string; p_limit?: number }
        Returns: {
          author_nombre: string
          author_user_id: number
          comentario_id: number
          comment_kind: string
          contenido: string
          context_id: number
          context_type: string
          created_at: string
          edited_at: string
          vinculos: Json
        }[]
      }
      get_contacto_vinculos: { Args: { p_contacto_id: number }; Returns: Json }
      get_manual_osi_batches: {
        Args: {
          p_company_name?: string
          p_limit?: number
          p_nro_osi?: string
          p_page?: number
        }
        Returns: {
          batches: Json
          total_count: number
          unique_companies: number
        }[]
      }
      get_my_app_context: { Args: { target_app_slug: string }; Returns: Json }
      get_my_notifications_cursor: {
        Args: {
          p_app_slug?: string
          p_before?: string
          p_event_key?: string
          p_limit?: number
          p_search?: string
        }
        Returns: {
          app_slug: string
          body: string
          created_at: string
          event_key: string
          id: string
          link_path: string
          metadata: Json
          priority: number
          read_at: string
          title: string
        }[]
      }
      get_next_control_numbers: { Args: { batch_size?: number }; Returns: Json }
      get_osi_aggregate_metrics: {
        Args: {
          p_company_name?: string
          p_date_issued_from?: string
          p_date_issued_to?: string
          p_date_service_from?: string
          p_date_service_to?: string
          p_ejecutivo?: string
          p_location?: string
          p_month_issued?: string
          p_nro_osi?: string
          p_num_hours_max?: number
          p_num_hours_min?: number
          p_num_sesiones_max?: number
          p_num_sesiones_min?: number
          p_status?: number
          p_tipo_servicio?: string
        }
        Returns: {
          total_hours: number
          total_sesiones: number
          unique_companies: number
        }[]
      }
      get_osi_filter_options: {
        Args: never
        Returns: {
          companies: Json
          ejecutivos: string[]
          statuses: Json
        }[]
      }
      get_pending_high_priority_email: {
        Args: { p_limit?: number; p_older_than?: string }
        Returns: {
          body: string
          created_at: string
          inbox_id: string
          link_path: string
          recipient_id_auth: string
          title: string
        }[]
      }
      get_pinned_comments_for_hub: {
        Args: { p_context_id: number; p_context_type: string }
        Returns: {
          author_user_id: number
          comentario_id: number
          comment_kind: string
          contenido: string
          created_at: string
          edited_at: string
          entity_id: number
          entity_subtitle: string
          entity_type: string
        }[]
      }
      get_user_permissions_by_app: {
        Args: { p_usuario_id: number }
        Returns: {
          app_slug: string
          permission_slug: string
        }[]
      }
      get_user_roles_by_app: {
        Args: { p_usuario_id: number }
        Returns: {
          app_slug: string
          role_slug: string
        }[]
      }
      horas_habiles:
        | { Args: { p_fin: string; p_inicio: string }; Returns: number }
        | { Args: { p_fin: string; p_inicio: string }; Returns: number }
      is_admin_or_superadmin: { Args: never; Returns: boolean }
      is_app_admin: {
        Args: { target_app_id: number; target_user_id: number }
        Returns: boolean
      }
      is_rr_pool_sales_user: {
        Args: { p_usuario_id: number }
        Returns: boolean
      }
      is_suplente_activo: {
        Args: { p_suplente_id: number; p_titular_id: number }
        Returns: boolean
      }
      mark_all_read: { Args: never; Returns: number }
      mark_notification_read: {
        Args: { p_notification_id: string }
        Returns: boolean
      }
      next_ejecucion_osi_nro_secuencial: { Args: never; Returns: string }
      notify_osi_change_saved: {
        Args: {
          p_change_type: string
          p_dedupe_key?: string
          p_id_osi: number
          p_summary: string
        }
        Returns: undefined
      }
      notify_shell_osi_status_changed: {
        Args: {
          p_ejecutivo_negocios?: string
          p_new_status_id: number
          p_new_status_name: string
          p_nro_osi: string
          p_osi_id: number
        }
        Returns: number
      }
      notify_solped_cancelled: {
        Args: { p_dedupe_key?: string; p_id_ecc: number; p_source?: string }
        Returns: undefined
      }
      notify_solped_change_saved:
        | {
            Args: { p_dedupe_key?: string; p_id_ecc: number; p_summary: string }
            Returns: undefined
          }
        | {
            Args: {
              p_changed_fields?: string[]
              p_dedupe_key?: string
              p_id_ecc: number
              p_summary: string
            }
            Returns: undefined
          }
      reassign_contacto_vinculos: {
        Args: {
          p_actor_usuario_id?: number
          p_from_contacto_id: number
          p_to_contacto_id: number
        }
        Returns: Json
      }
      reassign_empresa_ejecutivo: {
        Args: {
          p_actor_usuario_id?: number
          p_empresa_id: number
          p_new_owner_id: number
        }
        Returns: Json
      }
      recover_contacto: {
        Args: {
          p_actor_usuario_id?: number
          p_contacto_id: number
          p_reassign_to_id?: number
        }
        Returns: Json
      }
      refresh_comentario_activity_payload: {
        Args: { p_comentario_id: number }
        Returns: undefined
      }
      replace_comentario_entidad_vinculos: {
        Args: { p_comentario_id: number; p_links?: Json }
        Returns: Json
      }
      row_jsonb_is_status_only_change: {
        Args: { exclude_keys?: string[]; new_row: Json; old_row: Json }
        Returns: boolean
      }
      search_certificates: {
        Args: {
          p_company_id?: number
          p_course_id?: number
          p_date_from?: string
          p_date_to?: string
          p_facilitator_id?: number
          p_is_active?: boolean
          p_limit?: number
          p_page?: number
          p_search_term?: string
          p_sede_id?: number
          p_state_id?: number
        }
        Returns: {
          calificacion: number
          company_id: number
          company_razon_social: string
          company_rif: string
          course_contenido: string
          course_emite_carnet: boolean
          course_horas_estimadas: number
          course_id: number
          course_nombre: string
          course_nota_aprobatoria: number
          created_at: string
          facilitator_id: number
          facilitator_nombre_apellido: string
          fecha_emision: string
          fecha_vencimiento: string
          id: number
          is_active: boolean
          nro_osi: number
          participant_cedula: string
          participant_id: number
          participant_nacionalidad: string
          participant_nombre: string
          state_id: number
          state_nombre_estado: string
          total_count: number
        }[]
      }
      sp_cerrar_periodo: {
        Args: {
          p_forzar?: boolean
          p_periodo_id: number
          p_usuario_id?: number
        }
        Returns: undefined
      }
      sp_cerrar_periodos_vencidos: { Args: { p_max?: number }; Returns: number }
      sp_cerrar_periodos_vencidos_con_freeze: {
        Args: { p_max?: number }
        Returns: number
      }
      sp_dashboard_presupuesto_ejecutivos: {
        Args: {
          p_fecha_fin?: string
          p_fecha_inicio?: string
          p_fecha_referencia?: string
          p_modo_consulta?: string
          p_periodo_id?: number
          p_periodo_tipo?: string
        }
        Returns: {
          aprobacion_pct: number
          cantidad_aprobados: number
          cantidad_presupuestos_validos: number
          cumplimiento_pct: number
          ejecutivo_id: number
          ejecutivo_nombre: string
          meta_presupuesto: number
          monto_aprobado: number
          periodo_id: number
          porcentaje_meta: number
          real_presupuestado: number
        }[]
      }
      sp_dashboard_presupuesto_global: {
        Args: {
          p_fecha_fin?: string
          p_fecha_inicio?: string
          p_fecha_referencia?: string
          p_modo_consulta?: string
          p_periodo_id?: number
          p_periodo_tipo?: string
        }
        Returns: {
          aprobacion_pct: number
          brecha: number
          cantidad_aprobados: number
          cantidad_presupuestos_validos: number
          cumplimiento_operativo_pct: number
          cumplimiento_pct: number
          es_parcial: boolean
          estado_periodo: string
          fecha_corte_efectiva: string
          fecha_fin: string
          fecha_inicio: string
          logrado_operativo: number
          meta_operativa: number
          meta_presupuesto: number
          monto_aprobado: number
          periodo_id: number
          periodo_tipo: string
          porcentaje_aprobacion_meta: number
          real_presupuestado: number
        }[]
      }
      sp_provision_periodos_canonicos: {
        Args: { p_max_por_tipo?: number }
        Returns: number
      }
      sp_provision_periodos_canonicos_mensual: { Args: never; Returns: number }
      sp_provision_periodos_canonicos_tipo: {
        Args: { p_max?: number; p_periodo_tipo: string }
        Returns: number
      }
      sp_register_dashboard_close_jobs: { Args: never; Returns: undefined }
      sp_request_dashboard_freeze_snapshots: { Args: never; Returns: number }
      sp_set_cierre_programado_periodo: {
        Args: { p_activo: boolean; p_periodo_id: number; p_usuario_id?: number }
        Returns: undefined
      }
      sp_sync_meta_mensual_ecc: {
        Args: { p_anio_mes: string; p_usuario_id?: number }
        Returns: undefined
      }
      sp_upsert_meta_mensual: {
        Args: {
          p_anio_mes: string
          p_ejecutivos?: Json
          p_factor_meta_presupuesto?: number
          p_factor_meta_venta?: number
          p_meta_presupuesto_override?: number
          p_meta_venta_override?: number
          p_porcentaje_aprobacion_meta?: number
          p_presupuesto_empresa_mensual: number
          p_usuario_id?: number
        }
        Returns: {
          anio_mes: string
          meta_presupuesto_mensual: number
          meta_venta_mensual: number
          porcentaje_aprobacion_meta: number
        }[]
      }
      sync_comentario_menciones: {
        Args: { p_comentario_id: number; p_mentioned_user_ids: number[] }
        Returns: undefined
      }
      sync_normalize_name: { Args: { raw: string }; Returns: string }
      update_comentario_contexto: {
        Args: {
          p_comentario_id: number
          p_contenido: string
          p_links?: Json
          p_mentioned_user_ids?: number[]
        }
        Returns: Json
      }
      upsert_pinned_entity_comment: {
        Args: {
          p_author_user_id: number
          p_comment_kind: string
          p_contenido: string
          p_entity_id: number
          p_entity_type: string
        }
        Returns: number
      }
      user_can_access_negocios_comments: { Args: never; Returns: boolean }
      user_can_read_finance_review_content: { Args: never; Returns: boolean }
    }
    Enums: {
      firma_tipo: "facilitador" | "representante_sha"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      firma_tipo: ["facilitador", "representante_sha"],
    },
  },
} as const
