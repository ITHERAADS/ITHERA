ALTER TABLE public.voto
ADD COLUMN IF NOT EXISTS voto_tipo text NOT NULL DEFAULT 'a_favor';

ALTER TABLE public.voto
DROP CONSTRAINT IF EXISTS voto_voto_tipo_check;

ALTER TABLE public.voto
ADD CONSTRAINT voto_voto_tipo_check
CHECK (voto_tipo IN ('a_favor', 'en_contra', 'abstencion'));
