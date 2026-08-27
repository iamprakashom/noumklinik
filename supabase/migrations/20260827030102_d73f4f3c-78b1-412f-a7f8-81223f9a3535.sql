CREATE POLICY "Clinic staff read patient photos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'patient-photos' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'provider') OR public.has_role(auth.uid(),'front_desk')));

CREATE POLICY "Clinic staff upload patient photos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'patient-photos' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'provider') OR public.has_role(auth.uid(),'front_desk')));

CREATE POLICY "Clinic staff update patient photos" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'patient-photos' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'provider') OR public.has_role(auth.uid(),'front_desk')))
  WITH CHECK (bucket_id = 'patient-photos' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'provider') OR public.has_role(auth.uid(),'front_desk')));

CREATE POLICY "Clinic staff delete patient photos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'patient-photos' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'provider') OR public.has_role(auth.uid(),'front_desk')));