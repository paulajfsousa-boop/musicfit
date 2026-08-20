async function startLesson(){
  if(!lessonTracks.length){
    if(currentTrack){
      const snap=snapshotCurrentTrack();
      lessonTracks=[snap];
      activeLessonIndex=0;
      renderLesson();
    }else{
      return alert('Adiciona pelo menos uma faixa à aula.');
    }
  }
  lessonPlaying=true;
  loadLessonTrack(activeLessonIndex>=0?activeLessonIndex:0,true);
}

function updateRunPlayPause(){
  const b=document.getElementById('runPlayPauseBtn');
  if(!b) return;
  b.textContent=playerPaused?'▶ Continuar':'⏸ Pausa';
}
async function toggleRunPlayPause(){
  try{
    if(playerPaused){
      if(!currentTrack || !deviceId) return;
      lessonPlaying=lessonTracks.length>0;
      await api('/me/player/play?device_id='+encodeURIComponent(deviceId),{method:'PUT'});
    }else{
      await api('/me/player/pause',{method:'PUT'});
    }
  }catch(e){
    document.getElementById('playerStatus').textContent='Erro no controlo da aula: '+e.message;
  }
}
async function previousLessonTrack(){
  if(!lessonTracks.length) return;
  const target=Math.max(0,(activeLessonIndex<0?0:activeLessonIndex-1));
  lessonPlaying=true;
  loadLessonTrack(target,true);
}
async function nextLessonTrack(){
  if(!lessonTracks.length) return;
  const target=Math.min(lessonTracks.length-1,(activeLessonIndex<0?0:activeLessonIndex+1));
  lessonPlaying=true;
  loadLessonTrack(target,true);
}
async function advanceLessonTrack(){
  if(!lessonPlaying || switchingTrack) return;
  if(activeLessonIndex>=0 && activeLessonIndex<lessonTracks.length-1){
    loadLessonTrack(activeLessonIndex+1,true);
  }else{
    lessonPlaying=false;
    document.getElementById('lessonTrackLabel').textContent='Aula concluída';
  }
}

function updateRun(){
  const t=currentPosition;
  let idx=-1;
  for(let i=0;i<cues.length;i++){
    if(cues[i].time<=t) idx=i;
    else break;
  }

  const cur=idx>=0?cues[idx]:null;
  const nxt=idx+1<cues.length?cues[idx+1]:null;
  const currentEl=document.getElementById('currentExercise');
  const nextEl=document.getElementById('nextExercise');
  const countEl=document.getElementById('countdown');

  currentEl.textContent=cur?cur.name:'Preparar';
  const lessonLabel=document.getElementById('lessonTrackLabel');
  if(lessonTracks.length && activeLessonIndex>=0){
    lessonLabel.textContent='Faixa '+(activeLessonIndex+1)+'/'+lessonTracks.length+' · '+(currentTrack?.name||'');
  }else{
    lessonLabel.textContent='Agora';
  }
  nextEl.classList.remove('warn');
  countEl.classList.remove('beatwarn');

  if(nxt){
    nextEl.textContent='Próximo: '+nxt.name;

    const left=Math.max(0,nxt.time-t);
    const start=cur?cur.time:0;
    const span=Math.max(.1,nxt.time-start);
    const pct=Math.min(100,Math.max(0,(t-start)/span*100));
    document.getElementById('progress').style.width=pct+'%';

    if(trackBpm && trackBpm>0){
      const beatSeconds=60/trackBpm;
      const beatsLeft=Math.max(1,Math.ceil(left/beatSeconds));

      if(beatsLeft<=4){
        nextEl.classList.add('warn');
        countEl.classList.add('beatwarn');
        countEl.textContent=String(beatsLeft);
      }else if(beatsLeft<=8){
        nextEl.classList.add('warn');
        countEl.classList.add('beatwarn');
        countEl.textContent='8 tempos';
      }else{
        countEl.textContent=left.toFixed(left<10?1:0)+' s';
      }
    }else{
      countEl.textContent=left.toFixed(left<10?1:0)+' s';
    }
  }else{
    if(cur){
      nextEl.textContent='Até nova indicação';
      countEl.textContent='';
      document.getElementById('progress').style.width='100%';
    }else{
      nextEl.textContent='Próximo: —';
      countEl.textContent='—';
      document.getElementById('progress').style.width='0%';
    }
  }
}
function switchMode(run){document.getElementById('editMode').classList.toggle('hidden',run);document.getElementById('runMode').classList.toggle('hidden',!run);document.getElementById('tabEdit').className=run?'secondary':'';document.getElementById('tabRun').className=run?'':'secondary';updateRun();}
document.getElementById('tabEdit').onclick=()=>switchMode(false);document.getElementById('tabRun').onclick=()=>switchMode(true);
document.getElementById('runPlayPauseBtn').onclick=toggleRunPlayPause;document.getElementById('runBack10Btn').onclick=()=>seekTo(currentPosition-10);document.getElementById('runForward10Btn').onclick=()=>seekTo(currentPosition+10);document.getElementById('prevTrackBtn').onclick=previousLessonTrack;document.getElementById('nextTrackBtn').onclick=nextLessonTrack;
document.getElementById('fullscreenBtn').onclick=async()=>{document.body.classList.add('class-fullscreen');document.getElementById('fullscreenBtn').classList.add('hidden');document.getElementById('exitFullscreenBtn').classList.remove('hidden');try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen?.();}catch(e){}};document.getElementById('exitFullscreenBtn').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen?.();}catch(e){}document.body.classList.remove('class-fullscreen');document.getElementById('exitFullscreenBtn').classList.add('hidden');document.getElementById('fullscreenBtn').classList.remove('hidden');};document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement){document.body.classList.remove('class-fullscreen');document.getElementById('exitFullscreenBtn').classList.add('hidden');document.getElementById('fullscreenBtn').classList.remove('hidden');}});
renderLesson();
initAuth().catch(e=>document.getElementById('authStatus').textContent='Erro: '+e.message);