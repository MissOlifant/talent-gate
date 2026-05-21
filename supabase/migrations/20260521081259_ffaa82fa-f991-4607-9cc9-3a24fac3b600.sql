
-- 1. Wipe old attempts/questions so we can change enum cleanly
DELETE FROM public.assessment_attempts;
DELETE FROM public.questions;

-- 2. Replace category enum
ALTER TYPE public.question_category RENAME TO question_category_old;
CREATE TYPE public.question_category AS ENUM ('math','logic','patterns','technical');
ALTER TABLE public.questions
  ALTER COLUMN category TYPE public.question_category
  USING (CASE
    WHEN category::text IN ('math','logic','patterns','technical') THEN category::text::public.question_category
    ELSE 'logic'::public.question_category
  END);
DROP TYPE public.question_category_old;

-- 3. Password rotation tracking
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS is_staff BOOLEAN NOT NULL DEFAULT false;

-- 4. Update handle_new_user: respect is_staff flag from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_staff BOOLEAN := COALESCE((NEW.raw_user_meta_data->>'is_staff')::boolean, false);
BEGIN
  INSERT INTO public.profiles (id, full_name, id_number, email, phone, is_staff, password_changed_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name',''),
    COALESCE(NEW.raw_user_meta_data->>'id_number',''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone',''),
    v_is_staff,
    now()
  );
  IF v_is_staff THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
      ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'candidate')
      ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

-- Ensure trigger exists (was missing previously)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Password rotation helper
CREATE OR REPLACE FUNCTION public.password_expired(_user_id uuid)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT password_changed_at < now() - INTERVAL '30 days' FROM public.profiles WHERE id = _user_id),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.mark_password_changed()
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  UPDATE public.profiles SET password_changed_at = now() WHERE id = auth.uid();
END; $$;

-- 6. Update assessment config defaults
UPDATE public.assessment_config SET timer_minutes = 50 WHERE id = 1;

-- 7. Seed 50 questions
INSERT INTO public.questions (category, question_text, option_a, option_b, option_c, option_d, correct_answer) VALUES
-- MATH (13)
('math','What is 15% of 240?','30','36','40','45','B'),
('math','If x + 7 = 22, what is x?','13','14','15','16','C'),
('math','Solve: 12 × 8 − 25','61','71','81','91','B'),
('math','What is the square root of 144?','10','11','12','13','C'),
('math','A shirt costs $40 after a 20% discount. Original price?','$48','$50','$52','$60','B'),
('math','What is 3/4 of 80?','55','60','65','70','B'),
('math','If 2x − 5 = 11, x = ?','6','7','8','9','C'),
('math','Area of a rectangle 8m × 5m','30','35','40','45','C'),
('math','What is 7! / 5!?','21','35','42','48','C'),
('math','Convert 0.625 to a fraction.','3/8','5/8','7/8','2/3','B'),
('math','Average of 10, 20, 30, 40','20','25','30','35','B'),
('math','If a car travels 240km in 4 hours, average speed?','50 km/h','55 km/h','60 km/h','65 km/h','C'),
('math','Compound interest on $1000 at 10% for 2 years','$200','$210','$220','$230','B'),
-- LOGIC (13)
('logic','All cats are mammals. Some mammals swim. Therefore:','All cats swim','Some cats may swim','No cats swim','Mammals are cats','B'),
('logic','If today is Wednesday, what day is 100 days from today?','Tuesday','Wednesday','Thursday','Friday','D'),
('logic','Find the odd one out: Apple, Banana, Carrot, Mango','Apple','Banana','Carrot','Mango','C'),
('logic','If A=1, B=2 … then CAB = ?','312','321','123','132','A'),
('logic','Statement: All roses are flowers. Some flowers fade quickly. Conclusion?','All roses fade quickly','Some roses may fade quickly','No roses fade','None','B'),
('logic','John is taller than Mike. Mike is taller than Sam. Who is shortest?','John','Mike','Sam','Cannot tell','C'),
('logic','Which word does NOT belong: Dog, Cat, Lion, Car','Dog','Cat','Lion','Car','D'),
('logic','If "MONDAY" is coded as "NPOEBZ", how is "FRIDAY" coded?','GSJEBZ','GSJFCZ','GSJEBY','GSJFBY','A'),
('logic','A is B''s brother. C is A''s mother. How is C related to B?','Aunt','Mother','Sister','Cousin','B'),
('logic','Complete: 2, 6, 12, 20, 30, ?','40','42','44','46','B'),
('logic','If some pens are pencils and all pencils are erasers, then:','Some pens are erasers','All pens are erasers','No pens are erasers','None','A'),
('logic','Pointing to a man, Ravi says "He is my father''s only son''s son." Who is the man to Ravi?','Brother','Son','Nephew','Father','B'),
('logic','Find odd: 121, 169, 196, 225, 256, 270','196','225','256','270','D'),
-- PATTERNS (12)
('patterns','Next number: 2, 4, 8, 16, ?','24','28','32','36','C'),
('patterns','Next in series: A, C, E, G, ?','H','I','J','K','B'),
('patterns','Next: 1, 4, 9, 16, 25, ?','30','36','42','49','B'),
('patterns','Find missing: 3, 6, 12, 24, ?, 96','36','48','54','60','B'),
('patterns','Next letter: Z, X, V, T, ?','R','S','Q','P','A'),
('patterns','Next: 1, 1, 2, 3, 5, 8, ?','11','12','13','14','C'),
('patterns','Series: 100, 81, 64, 49, ?','36','35','38','40','A'),
('patterns','Next: 5, 10, 20, 40, ?','60','70','80','100','C'),
('patterns','Find pattern: AZ, BY, CX, DW, ?','EV','FU','EU','EW','A'),
('patterns','Next: 7, 14, 28, 56, ?','98','112','126','140','B'),
('patterns','Series: 2, 3, 5, 7, 11, 13, ?','15','16','17','19','C'),
('patterns','Next: 1, 8, 27, 64, ?','100','125','144','216','B'),
-- TECHNICAL (12)
('technical','What does CPU stand for?','Central Processing Unit','Computer Personal Unit','Central Process Utility','Core Processing Unit','A'),
('technical','Which is NOT an operating system?','Linux','Windows','Oracle','macOS','C'),
('technical','HTML stands for?','Hyper Trainer Marking Language','Hyper Text Markup Language','High Text Machine Language','Hyperlink Text Markup Language','B'),
('technical','Which is a relational database?','MongoDB','Redis','PostgreSQL','Cassandra','C'),
('technical','HTTP status code for "Not Found"?','200','301','404','500','C'),
('technical','RAM stands for?','Random Access Memory','Read Active Memory','Run And Memory','Rapid Access Module','A'),
('technical','Which protocol is used to send email?','HTTP','SMTP','FTP','SNMP','B'),
('technical','In Git, which command creates a new branch?','git new','git branch','git create','git fork','B'),
('technical','What does SQL stand for?','Structured Query Language','Sequential Query Language','Simple Query Language','Standard Question Language','A'),
('technical','Which is a JavaScript framework?','Django','Laravel','React','Rails','C'),
('technical','Default port for HTTPS?','21','80','443','8080','C'),
('technical','Which is NOT a programming language?','Python','HTML','Java','C++','B');
