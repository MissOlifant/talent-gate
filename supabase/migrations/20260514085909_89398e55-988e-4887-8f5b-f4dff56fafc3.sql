
CREATE TYPE public.app_role AS ENUM ('admin', 'candidate');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  id_number TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.email_for_id_number(_id_number TEXT)
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT email FROM public.profiles WHERE id_number = _id_number LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.email_for_id_number(TEXT) TO anon, authenticated;

CREATE TYPE public.question_category AS ENUM ('logical_reasoning','it_knowledge','problem_solving','communication');

CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category question_category NOT NULL,
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer CHAR(1) NOT NULL CHECK (correct_answer IN ('A','B','C','D')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view active questions" ON public.questions FOR SELECT TO authenticated
  USING (active = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage questions" ON public.questions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.assessment_config (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  timer_minutes INT NOT NULL DEFAULT 30,
  pass_mark INT NOT NULL DEFAULT 70,
  active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.assessment_config ENABLE ROW LEVEL SECURITY;
INSERT INTO public.assessment_config (id) VALUES (1);

CREATE POLICY "Anyone authenticated reads config" ON public.assessment_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins update config" ON public.assessment_config FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE TYPE public.attempt_status AS ENUM ('in_progress','completed');

CREATE TABLE public.assessment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status attempt_status NOT NULL DEFAULT 'in_progress',
  question_ids UUID[] NOT NULL DEFAULT '{}',
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  score INT,
  total INT,
  percentage NUMERIC(5,2),
  passed BOOLEAN,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ
);
ALTER TABLE public.assessment_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Candidates view own attempts" ON public.assessment_attempts FOR SELECT TO authenticated
  USING (auth.uid() = candidate_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Candidates insert own attempts" ON public.assessment_attempts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = candidate_id);
CREATE POLICY "Candidates update own attempts" ON public.assessment_attempts FOR UPDATE TO authenticated
  USING (auth.uid() = candidate_id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, id_number, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name',''),
    COALESCE(NEW.raw_user_meta_data->>'id_number',''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone','')
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'candidate');
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.questions (category, question_text, option_a, option_b, option_c, option_d, correct_answer) VALUES
('logical_reasoning','If all roses are flowers and some flowers fade quickly, which is true?','All roses fade quickly','Some roses may fade quickly','No roses fade quickly','Roses are not flowers','B'),
('logical_reasoning','Find the next number: 2, 6, 12, 20, 30, ?','40','42','38','44','B'),
('logical_reasoning','Which word does not belong: Apple, Banana, Carrot, Mango','Apple','Banana','Carrot','Mango','C'),
('logical_reasoning','If A=1, B=2, C=3, what does CAB equal?','312','321','123','132','A'),
('logical_reasoning','Pen is to write as knife is to ?','Cut','Sharp','Kitchen','Metal','A'),
('it_knowledge','What does CPU stand for?','Central Process Unit','Central Processing Unit','Computer Personal Unit','Central Processor Utility','B'),
('it_knowledge','Which is NOT an operating system?','Windows','Linux','Oracle','macOS','C'),
('it_knowledge','HTML stands for?','HyperText Markup Language','HighText Machine Language','HyperTabular Markup Lang','None of the above','A'),
('it_knowledge','Which protocol is used for secure web browsing?','HTTP','FTP','HTTPS','SMTP','C'),
('it_knowledge','RAM is a type of?','Storage','Memory','Processor','Network','B'),
('problem_solving','A train 100m long passes a pole in 10s. Speed?','10 m/s','20 m/s','36 m/s','100 m/s','A'),
('problem_solving','If 5 workers build a wall in 10 days, how long for 10 workers (same rate)?','5 days','10 days','20 days','15 days','A'),
('problem_solving','You have 3L and 5L jugs. How to measure exactly 4L?','Impossible','Fill 5L, pour into 3L until full, empty 3L, pour remainder, refill 5L','Use a ratio','Fill 3L twice','B'),
('problem_solving','Letter pattern: O, T, T, F, F, S, S, ? (one,two,three...)','Eight (E)','Nine (N)','Ten (T)','Seven (S)','A'),
('problem_solving','Cost 800, sold at 1000. Profit %?','20%','25%','15%','10%','B'),
('communication','Choose correct: "She ___ to school every day."','go','goes','going','gone','B'),
('communication','Synonym of "Rapid"?','Slow','Quick','Heavy','Light','B'),
('communication','Which is a formal greeting?','Hey!','Yo','Good morning','Sup','C'),
('communication','Antonym of "Generous"?','Kind','Selfish','Rich','Helpful','B'),
('communication','Best response to "Thank you"?','Whatever','You are welcome','Okay','Sure thing','B');
