CREATE TABLE public.packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  validity_days integer NOT NULL DEFAULT 180,
  refundable boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.packages TO authenticated;
GRANT ALL ON public.packages TO service_role;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clinic staff manage packages" ON public.packages FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','provider','front_desk')))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','provider','front_desk')));
CREATE TRIGGER packages_touch BEFORE UPDATE ON public.packages FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.package_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id),
  sessions integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.package_items TO authenticated;
GRANT ALL ON public.package_items TO service_role;
ALTER TABLE public.package_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clinic staff manage package items" ON public.package_items FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','provider','front_desk')))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','provider','front_desk')));

CREATE TABLE public.patient_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  package_id uuid REFERENCES public.packages(id),
  invoice_id uuid REFERENCES public.invoices(id),
  name text NOT NULL,
  price_paid numeric NOT NULL DEFAULT 0,
  purchased_at date NOT NULL DEFAULT CURRENT_DATE,
  expires_at date NOT NULL,
  status text NOT NULL DEFAULT 'Active',
  extension_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_packages TO authenticated;
GRANT ALL ON public.patient_packages TO service_role;
ALTER TABLE public.patient_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clinic staff manage patient packages" ON public.patient_packages FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','provider','front_desk')))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','provider','front_desk')));
CREATE TRIGGER patient_packages_touch BEFORE UPDATE ON public.patient_packages FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.patient_package_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_package_id uuid NOT NULL REFERENCES public.patient_packages(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.services(id),
  service_name text NOT NULL,
  sessions_total integer NOT NULL DEFAULT 1,
  sessions_used integer NOT NULL DEFAULT 0,
  unit_value numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_package_items TO authenticated;
GRANT ALL ON public.patient_package_items TO service_role;
ALTER TABLE public.patient_package_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clinic staff manage patient package items" ON public.patient_package_items FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','provider','front_desk')))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','provider','front_desk')));

CREATE TABLE public.package_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_package_id uuid NOT NULL REFERENCES public.patient_packages(id) ON DELETE CASCADE,
  patient_package_item_id uuid NOT NULL REFERENCES public.patient_package_items(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES public.appointments(id),
  provider_id uuid REFERENCES public.providers(id),
  service_name text NOT NULL,
  value_recognised numeric NOT NULL DEFAULT 0,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.package_redemptions TO authenticated;
GRANT ALL ON public.package_redemptions TO service_role;
ALTER TABLE public.package_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clinic staff manage package redemptions" ON public.package_redemptions FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','provider','front_desk')))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','provider','front_desk')));