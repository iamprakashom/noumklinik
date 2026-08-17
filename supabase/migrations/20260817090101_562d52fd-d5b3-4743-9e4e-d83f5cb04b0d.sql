CREATE TABLE public.people (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL CHECK (role IN ('PM','Editor','Executor')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.people TO authenticated;
GRANT ALL ON public.people TO service_role;
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users manage people" ON public.people FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.campaigns (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  client TEXT NOT NULL,
  song TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'Created' CHECK (stage IN ('Created','PM Assigned','Ideation','Editing/Sampling','Approval','Execution','Reporting','Completed')),
  pm_id TEXT REFERENCES public.people(id) ON DELETE SET NULL,
  executor_id TEXT REFERENCES public.people(id) ON DELETE SET NULL,
  deadline DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT ALL ON public.campaigns TO service_role;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users manage campaigns" ON public.campaigns FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.deliverables (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  campaign_id TEXT NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  done BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX deliverables_campaign_id_idx ON public.deliverables (campaign_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deliverables TO authenticated;
GRANT ALL ON public.deliverables TO service_role;
ALTER TABLE public.deliverables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users manage deliverables" ON public.deliverables FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO public.people (id, name, role, active) VALUES
  ('p1','Aditi Rao','PM',true),
  ('p2','Marcus Bell','PM',true),
  ('p3','Nina Kovač','Editor',true),
  ('p4','Yuki Tanaka','Editor',false),
  ('p5','Diego Alvarez','Executor',true),
  ('p6','Sara Lindqvist','Executor',true),
  ('p7','Tom Okafor','PM',true),
  ('p8','Elena Rossi','Editor',true);

INSERT INTO public.campaigns (id, client, song, stage, pm_id, executor_id, deadline) VALUES
  ('c1','Neon Harbour','Static Bloom','Created','p1','p5','2026-09-04'),
  ('c2','Wrenfield Records','Paper Cities','Created','p2','p6','2026-08-16'),
  ('c3','Halcyon Group','Low Tide','PM Assigned','p1','p5','2026-08-13'),
  ('c4','Ivory Tape','Midnight Ration','PM Assigned','p7','p6','2026-09-11'),
  ('c5','Beacon Sound','Ghostwriter','Ideation','p2','p5','2026-08-15'),
  ('c6','Neon Harbour','Cassette Sun','Ideation','p1','p6','2026-09-01'),
  ('c7','Marrow Music','Tin Roof','Editing/Sampling','p1','p5','2026-08-12'),
  ('c8','Wrenfield Records','Slow Freight','Editing/Sampling','p7','p6','2026-08-24'),
  ('c9','Halcyon Group','Vermilion','Approval','p2','p5','2026-08-16'),
  ('c10','Ivory Tape','Held Breath','Approval','p1','p6','2026-08-11'),
  ('c11','Beacon Sound','Radio Silence','Execution','p1','p5','2026-08-28'),
  ('c12','Marrow Music','Copper Wire','Execution','p2','p6','2026-08-17'),
  ('c13','Neon Harbour','Afterglow','Reporting','p7','p5','2026-08-21'),
  ('c14','Wrenfield Records','Salt & Static','Completed','p1','p6','2026-08-02'),
  ('c15','Halcyon Group','Blue Hour','Completed','p2','p5','2026-07-29'),
  ('c16','Ivory Tape','Dust Choir','Completed','p7','p6','2026-07-22');

INSERT INTO public.deliverables (campaign_id, label, done, position)
SELECT d.campaign_id, l.label, l.pos <= d.done_count, l.pos
FROM (VALUES
  ('c1',0),('c2',1),('c3',1),('c4',1),('c5',2),('c6',2),('c7',3),('c8',3),
  ('c9',4),('c10',4),('c11',4),('c12',5),('c13',5),('c14',6),('c15',6),('c16',6)
) AS d(campaign_id, done_count)
CROSS JOIN (VALUES
  ('Creative brief signed off',1),
  ('Reference playlist curated',2),
  ('30s edit master',3),
  ('Vertical cutdowns (9:16)',4),
  ('Creator seeding list',5),
  ('Performance report',6)
) AS l(label, pos);