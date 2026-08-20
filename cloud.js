const SUPABASE_URL = "https://uydghuahspjtluyvbmwr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Zbcr2WJg8MapFup2Ba6RnA_obz2UtOi";
const sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

let cloudUser = null;
let cloudLessons = [];
let selectedCloudLessonId = null;

function cloudMessage(msg){
  const el=document.getElementById('cloudAuthStatus');
  if(el) el.textContent=msg;
}

function updateCloudUI(){
  const signedIn=!!cloudUser;
  document.getElementById('cloudSignedOut').classList.toggle('hidden',signedIn);
  document.getElementById('cloudSignedIn').classList.toggle('hidden',!signedIn);
  document.getElementById('cloudSignOutBtn').classList.toggle('hidden',!signedIn);
  if(signedIn){
    document.getElementById('cloudUserStatus').textContent='Biblioteca ligada: '+(cloudUser.email||'utilizador');
  }
}

async function initCloudAuth(){
  const {data:{session}}=await sbClient.auth.getSession();
  cloudUser=session?.user||null;
  updateCloudUI();
  if(cloudUser) await loadCloudLessons();
  sbClient.auth.onAuthStateChange(async (_event,session)=>{
    cloudUser=session?.user||null;
    selectedCloudLessonId=null;
    updateCloudUI();
    if(cloudUser) await loadCloudLessons();
    else {
      cloudLessons=[];
      renderCloudLessons();
    }
  });
}

async function cloudSignIn(){
  const email=document.getElementById('cloudEmail').value.trim();
  const password=document.getElementById('cloudPassword').value;
  if(!email||!password) return cloudMessage('Indica email e palavra-passe.');
  cloudMessage('A entrar...');
  const {error}=await sbClient.auth.signInWithPassword({email,password});
  if(error) cloudMessage('Erro: '+error.message);
}

async function cloudSignUp(){
  const email=document.getElementById('cloudEmail').value.trim();
  const password=document.getElementById('cloudPassword').value;
  if(!email||password.length<6) return cloudMessage('Indica um email e uma palavra-passe com pelo menos 6 caracteres.');
  cloudMessage('A criar conta...');
  const {data,error}=await sbClient.auth.signUp({email,password});
  if(error) return cloudMessage('Erro: '+error.message);
  cloudMessage(data.session ? 'Conta criada e sessão iniciada.' : 'Conta criada. Confirma o email recebido e depois entra na biblioteca.');
}

async function loadCloudLessons(){
  if(!cloudUser) return;
  const {data,error}=await sbClient
    .from('musicfit_lessons')
    .select('id,name,lesson_data,updated_at')
    .order('updated_at',{ascending:false});
  if(error){
    document.getElementById('cloudLessonList').innerHTML='<div class="status">Erro ao carregar biblioteca: '+esc(error.message)+'</div>';
    return;
  }
  cloudLessons=data||[];
  renderCloudLessons();
}

function renderCloudLessons(){
  const box=document.getElementById('cloudLessonList');
  if(!box) return;
  box.innerHTML='';
  if(!cloudUser) return;
  if(!cloudLessons.length){
    box.innerHTML='<div class="tiny">Ainda não tens aulas guardadas online.</div>';
    return;
  }
  cloudLessons.forEach(item=>{
    const div=document.createElement('div');
    div.className='cloud-item'+(item.id===selectedCloudLessonId?' active':'');
    const count=Array.isArray(item.lesson_data?.tracks)?item.lesson_data.tracks.length:0;
    const date=item.updated_at?new Date(item.updated_at).toLocaleString('pt-PT'):'';
    div.innerHTML=`<div class="trackmeta"><b>${esc(item.name)}</b><span>${count} faixa${count===1?'':'s'}${date?' · '+esc(date):''}</span></div><div class="cloud-actions"><button class="open secondary">Abrir</button><button class="delete danger">Apagar</button></div>`;
    div.querySelector('.open').onclick=()=>openCloudLesson(item.id);
    div.querySelector('.delete').onclick=()=>deleteCloudLesson(item.id,item.name);
    box.appendChild(div);
  });
}

async function openCloudLesson(id){
  const item=cloudLessons.find(x=>x.id===id);
  if(!item) return;
  const tracks=item.lesson_data?.tracks;
  if(!Array.isArray(tracks)) return alert('Esta aula não tem um formato válido.');
  lessonTracks=JSON.parse(JSON.stringify(tracks));
  activeLessonIndex=lessonTracks.length?0:-1;
  selectedCloudLessonId=item.id;
  document.getElementById('cloudLessonName').value=item.name||'';
  renderLesson();
  renderCloudLessons();
  if(activeLessonIndex>=0) loadLessonTrack(activeLessonIndex,false);
}

function ensureLessonSnapshot(){
  syncCurrentTrackIntoLesson();
  if(!lessonTracks.length && currentTrack){
    const snap=snapshotCurrentTrack();
    if(snap){
      lessonTracks=[snap];
      activeLessonIndex=0;
      renderLesson();
    }
  }
  return lessonTracks.length>0;
}

async function saveCloudLesson(){
  if(!cloudUser) return alert('Entra primeiro na biblioteca online.');
  if(!ensureLessonSnapshot()) return alert('Ainda não tens nenhuma faixa nesta aula.');
  const name=document.getElementById('cloudLessonName').value.trim();
  if(!name) return alert('Dá um nome à aula antes de guardar.');
  const lesson_data={type:'musicfit-lesson',version:2,tracks:lessonTracks};
  const payload={user_id:cloudUser.id,name,lesson_data,updated_at:new Date().toISOString()};
  let result;
  if(selectedCloudLessonId){
    result=await sbClient.from('musicfit_lessons').update(payload).eq('id',selectedCloudLessonId).select('id').single();
  }else{
    result=await sbClient.from('musicfit_lessons').insert(payload).select('id').single();
  }
  if(result.error) return alert('Não consegui guardar a aula: '+result.error.message);
  selectedCloudLessonId=result.data?.id||selectedCloudLessonId;
  await loadCloudLessons();
  alert('Aula guardada na biblioteca online.');
}

function newCloudLesson(){
  selectedCloudLessonId=null;
  document.getElementById('cloudLessonName').value='';
  lessonTracks=[];
  activeLessonIndex=-1;
  lessonPlaying=false;
  renderLesson();
  renderCloudLessons();
}

async function deleteCloudLesson(id,name){
  if(!confirm('Apagar a aula "'+name+'" da biblioteca online?')) return;
  const {error}=await sbClient.from('musicfit_lessons').delete().eq('id',id);
  if(error) return alert('Não consegui apagar: '+error.message);
  if(selectedCloudLessonId===id) selectedCloudLessonId=null;
  await loadCloudLessons();
}

document.getElementById('cloudSignInBtn').onclick=cloudSignIn;
document.getElementById('cloudSignUpBtn').onclick=cloudSignUp;
document.getElementById('cloudSignOutBtn').onclick=()=>sbClient.auth.signOut();
document.getElementById('cloudSaveBtn').onclick=saveCloudLesson;
document.getElementById('cloudNewBtn').onclick=newCloudLesson;
document.getElementById('cloudRefreshBtn').onclick=loadCloudLessons;

initCloudAuth().catch(e=>cloudMessage('Erro na biblioteca: '+e.message));