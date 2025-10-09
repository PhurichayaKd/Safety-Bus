-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.card_history (
  history_id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  student_id integer NOT NULL,
  action_type text NOT NULL CHECK (action_type = ANY (ARRAY['issue'::text, 'expire'::text, 'renew'::text, 'cancel'::text, 'suspend'::text, 'reactivate'::text])),
  old_status text,
  new_status text NOT NULL,
  reason text,
  performed_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT card_history_pkey PRIMARY KEY (history_id),
  CONSTRAINT card_history_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(student_id),
  CONSTRAINT card_history_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES auth.users(id)
);
CREATE TABLE public.driver_bus (
  driver_id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  driver_name character varying NOT NULL,
  phone_number character varying NOT NULL UNIQUE,
  username character varying NOT NULL UNIQUE,
  license_plate character varying NOT NULL UNIQUE,
  capacity integer NOT NULL,
  route_id integer,
  created_at timestamp with time zone DEFAULT now(),
  auth_user_id uuid NOT NULL UNIQUE,
  home_latitude numeric CHECK (home_latitude IS NULL OR home_latitude >= '-90'::integer::numeric AND home_latitude <= 90::numeric),
  home_longitude numeric CHECK (home_longitude IS NULL OR home_longitude >= '-180'::integer::numeric AND home_longitude <= 180::numeric),
  school_latitude numeric CHECK (school_latitude IS NULL OR school_latitude >= '-90'::integer::numeric AND school_latitude <= 90::numeric),
  school_longitude numeric CHECK (school_longitude IS NULL OR school_longitude >= '-180'::integer::numeric AND school_longitude <= 180::numeric),
  current_updated_at timestamp with time zone,
  current_latitude numeric,
  current_longitude numeric,
  CONSTRAINT driver_bus_pkey PRIMARY KEY (driver_id),
  CONSTRAINT driver_bus_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.routes(route_id),
  CONSTRAINT driver_bus_auth_user_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.emergency_logs (
  event_id integer NOT NULL DEFAULT nextval('events_event_id_seq'::regclass),
  driver_id integer NOT NULL,
  event_time timestamp with time zone NOT NULL DEFAULT now(),
  event_type text NOT NULL CHECK (event_type = ANY (ARRAY['PANIC_BUTTON'::text, 'SENSOR_ALERT'::text, 'DRIVER_INCAPACITATED'::text])),
  triggered_by text NOT NULL CHECK (triggered_by = ANY (ARRAY['sensor'::text, 'driver'::text, 'student'::text])),
  details jsonb,
  CONSTRAINT emergency_logs_pkey PRIMARY KEY (event_id),
  CONSTRAINT events_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.driver_bus(driver_id)
);
CREATE TABLE public.leave_requests (
  id integer NOT NULL DEFAULT nextval('leave_requests_id_seq'::regclass),
  student_id integer NOT NULL,
  leave_date date NOT NULL,
  status character varying DEFAULT 'approved'::character varying,
  leave_type character varying DEFAULT 'personal'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  cancelled_at timestamp with time zone,
  CONSTRAINT leave_requests_pkey PRIMARY KEY (id),
  CONSTRAINT fk_leave_requests_student_id FOREIGN KEY (student_id) REFERENCES public.students(student_id)
);
CREATE TABLE public.live_driver_locations (
  driver_id integer NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  last_updated timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT live_driver_locations_pkey PRIMARY KEY (driver_id),
  CONSTRAINT live_driver_locations_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.driver_bus(driver_id)
);
CREATE TABLE public.notification_logs (
  id bigint NOT NULL DEFAULT nextval('notification_logs_id_seq'::regclass),
  notification_type character varying NOT NULL,
  recipient_id text NOT NULL,
  message text NOT NULL,
  status character varying NOT NULL,
  error_details json,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notification_logs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.parent_line_links (
  link_id bigint NOT NULL DEFAULT nextval('parent_line_links_link_id_seq'::regclass),
  parent_id integer NOT NULL,
  line_user_id text UNIQUE,
  linked_at timestamp with time zone NOT NULL DEFAULT now(),
  active boolean NOT NULL DEFAULT true,
  line_display_id character varying,
  CONSTRAINT parent_line_links_pkey PRIMARY KEY (link_id),
  CONSTRAINT parent_line_links_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.parents(parent_id)
);
CREATE TABLE public.parent_link_tokens (
  token_id bigint NOT NULL DEFAULT nextval('parent_link_tokens_token_id_seq'::regclass),
  parent_id integer NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + '1 day'::interval),
  used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  issued_by integer,
  used_by_line_user_id text,
  CONSTRAINT parent_link_tokens_pkey PRIMARY KEY (token_id),
  CONSTRAINT parent_link_tokens_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.parents(parent_id),
  CONSTRAINT parent_link_tokens_issued_by_fkey FOREIGN KEY (issued_by) REFERENCES public.driver_bus(driver_id)
);
CREATE TABLE public.parents (
  parent_id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  parent_name character varying NOT NULL,
  parent_phone character varying NOT NULL,
  CONSTRAINT parents_pkey PRIMARY KEY (parent_id)
);
CREATE TABLE public.pickup_dropoff (
  record_id integer NOT NULL DEFAULT nextval('pickup_dropoff_record_id_seq'::regclass),
  student_id integer NOT NULL,
  driver_id integer NOT NULL,
  event_time timestamp with time zone NOT NULL DEFAULT now(),
  event_type text NOT NULL CHECK (event_type = ANY (ARRAY['pickup'::text, 'dropoff'::text, 'absent'::text])),
  gps_latitude numeric,
  gps_longitude numeric,
  last_scan_time timestamp with time zone NOT NULL DEFAULT now(),
  location_type text NOT NULL DEFAULT 'unknown'::text CHECK (location_type = ANY (ARRAY['go'::text, 'return'::text, 'unknown'::text])),
  pickup_source text,
  scan_window tstzrange,
  event_local_date date DEFAULT ((event_time AT TIME ZONE 'Asia/Bangkok'::text))::date,
  CONSTRAINT pickup_dropoff_pkey PRIMARY KEY (record_id),
  CONSTRAINT pickup_dropoff_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.driver_bus(driver_id),
  CONSTRAINT fk_pickup_dropoff_student_id FOREIGN KEY (student_id) REFERENCES public.students(student_id)
);
CREATE TABLE public.rfid_card_assignments (
  card_id bigint NOT NULL,
  student_id integer NOT NULL,
  valid_from timestamp with time zone NOT NULL DEFAULT now(),
  valid_to timestamp with time zone,
  assigned_by integer,
  is_active boolean DEFAULT true,
  CONSTRAINT rfid_card_assignments_pkey PRIMARY KEY (valid_from, card_id),
  CONSTRAINT rfid_card_assignments_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.rfid_cards(card_id),
  CONSTRAINT rfid_card_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.driver_bus(driver_id),
  CONSTRAINT fk_rfid_card_assignments_student_id FOREIGN KEY (student_id) REFERENCES public.students(student_id)
);
CREATE TABLE public.rfid_cards (
  card_id bigint NOT NULL DEFAULT nextval('rfid_cards_card_id_seq'::regclass),
  rfid_code character varying NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  status text DEFAULT 'available'::text CHECK (status = ANY (ARRAY['available'::text, 'assigned'::text, 'lost'::text, 'damaged'::text, 'retired'::text])),
  last_seen_at timestamp with time zone,
  CONSTRAINT rfid_cards_pkey PRIMARY KEY (card_id)
);
CREATE TABLE public.rfid_scan_logs (
  scan_id integer NOT NULL DEFAULT nextval('rfid_scan_logs_scan_id_seq'::regclass),
  rfid_code character varying NOT NULL,
  driver_id integer,
  student_id integer,
  scan_time timestamp with time zone DEFAULT now(),
  latitude numeric,
  longitude numeric,
  location_type character varying CHECK (location_type::text = ANY (ARRAY['go'::character varying, 'back'::character varying]::text[])),
  scan_result character varying DEFAULT 'success'::character varying,
  error_message text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT rfid_scan_logs_pkey PRIMARY KEY (scan_id)
);
CREATE TABLE public.route_students (
  route_id integer NOT NULL,
  student_id integer NOT NULL,
  stop_order integer NOT NULL,
  CONSTRAINT route_students_pkey PRIMARY KEY (route_id, student_id),
  CONSTRAINT route_students_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.routes(route_id),
  CONSTRAINT fk_route_students_student_id FOREIGN KEY (student_id) REFERENCES public.students(student_id)
);
CREATE TABLE public.routes (
  route_id integer NOT NULL DEFAULT nextval('routes_route_id_seq'::regclass),
  route_name character varying NOT NULL,
  start_point character varying NOT NULL,
  end_point character varying NOT NULL,
  route_data jsonb NOT NULL,
  start_latitude numeric,
  start_longitude numeric,
  end_latitude numeric,
  end_longitude numeric,
  CONSTRAINT routes_pkey PRIMARY KEY (route_id)
);
CREATE TABLE public.student_guardians (
  student_id integer NOT NULL,
  parent_id integer NOT NULL,
  relationship character varying,
  is_primary boolean NOT NULL DEFAULT false,
  CONSTRAINT student_guardians_pkey PRIMARY KEY (parent_id, student_id),
  CONSTRAINT student_guardians_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.parents(parent_id),
  CONSTRAINT fk_student_guardians_student_id FOREIGN KEY (student_id) REFERENCES public.students(student_id)
);
CREATE TABLE public.student_line_links (
  link_id bigint NOT NULL DEFAULT nextval('student_line_links_link_id_seq'::regclass),
  student_id integer NOT NULL,
  line_user_id text UNIQUE,
  linked_at timestamp with time zone NOT NULL DEFAULT now(),
  active boolean NOT NULL DEFAULT true,
  line_display_id character varying,
  CONSTRAINT student_line_links_pkey PRIMARY KEY (link_id),
  CONSTRAINT fk_student_line_links_student_id FOREIGN KEY (student_id) REFERENCES public.students(student_id)
);
CREATE TABLE public.student_link_tokens (
  token_id bigint NOT NULL DEFAULT nextval('student_link_tokens_token_id_seq'::regclass),
  student_id integer NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + '1 day'::interval),
  used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  used_by_line_user_id text,
  issued_by integer,
  CONSTRAINT student_link_tokens_pkey PRIMARY KEY (token_id),
  CONSTRAINT fk_student_link_tokens_student_id FOREIGN KEY (student_id) REFERENCES public.students(student_id),
  CONSTRAINT student_link_tokens_issued_by_fkey FOREIGN KEY (issued_by) REFERENCES public.driver_bus(driver_id)
);
CREATE TABLE public.students (
  student_id integer NOT NULL DEFAULT nextval('students_student_id_seq'::regclass),
  student_name character varying NOT NULL,
  grade character varying NOT NULL,
  rfid_tag character varying,
  parent_id integer,
  start_date date NOT NULL,
  end_date date NOT NULL,
  home_latitude numeric,
  home_longitude numeric,
  student_phone character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_active boolean DEFAULT true,
  status character varying,
  CONSTRAINT students_pkey PRIMARY KEY (student_id),
  CONSTRAINT students_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.parents(parent_id)
);