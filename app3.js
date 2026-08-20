function loadLessonTrack(index, autoPlay=false){
  if(index<0 || index>=lessonTracks.length) return;
  activeLessonIndex=index;
  const item=lessonTracks[index];
  currentTrack={...item.track};
  trackBpm=item.bpm||null;
  cues=(item.cues||[]).map(c=>({time:Number(c.time),name:c.name}));
  currentPosition=0;
  currentDuration=currentTrack.duration || currentDuration || 0;
  document.getElementById('bpmInput').value=trackBpm||'';
  renderCues();
  showTrack();
  updateSeekUI();
  updateRun();
  renderLesson();
  if(autoPlay) playCurrentTrackFromStart();
}

async function playCurrentTrackFromStart(){
  if(!currentTrack||!deviceId) return;
  switchingTrack=true;
  currentPosition=0;
  try{
    if(player && player.activateElement) await player.activateElement();
    await api('/me/player/play?device_id='+encodeURIComponent(deviceId),{
      method:'PUT',
      body:JSON.stringify({uris:[currentTrack.uri],position_ms:0})
    });
  }catch(e){
    document.getElementById('playerStatus').textContent='Erro ao iniciar faixa: '+e.message;
  }
  setTimeout(()=>{switchingTrack=false;},1200);
}

function renderLesson(){
  const box=document.getElementById('lessonList');
  box.innerHTML='';
  if(!lessonTracks.length){
    box.innerHTML='<div class="tiny">Ainda não adicionaste faixas à aula.</div>';
    return;
  }
  lessonTracks.forEach((item,i)=>{
    const div=document.createElement('div');
    div.className='lesson-item'+(i===activeLessonIndex?' active':'');
    div.innerHTML=`
      <div class="lesson-num">${i+1}</div>
      <div class="trackmeta">
        <b>${esc(item.track?.name||'Faixa')}</b>
        <span>${esc(item.track?.artist||'')} · ${(item.cues||[]).length} cues${item.bpm?' · '+item.bpm+' BPM':''}</span>
      </div>
      <div class="lesson-actions">
        <button class="open secondary">Abrir</button>
        <button class="up secondary">↑</button>
        <button class="down secondary">↓</button>
        <button class="remove danger">×</button>
      </div>`;
    div.querySelector('.open').onclick=()=>loadLessonTrack(i,false);
    div.querySelector('.up').onclick=()=>{
      if(i===0)return;
      [lessonTracks[i-1],lessonTracks[i]]=[lessonTracks[i],lessonTracks[i-1]];
      if(activeLessonIndex===i) activeLessonIndex=i-1;
      else if(activeLessonIndex===i-1) activeLessonIndex=i;
      renderLesson();
    };
    div.querySelector('.down').onclick=()=>{
      if(i===lessonTracks.length-1)return;
      [lessonTracks[i+1],lessonTracks[i]]=[lessonTracks[i],lessonTracks[i+1]];
      if(activeLessonIndex===i) activeLessonIndex=i+1;
      else if(activeLessonIndex===i+1) activeLessonIndex=i;
      renderLesson();
    };
    div.querySelector('.remove').onclick=()=>{
      lessonTracks.splice(i,1);
      if(activeLessonIndex===i) activeLessonIndex=-1;
      else if(activeLessonIndex>i) activeLessonIndex--;
      renderLesson();
      updateRun();
    };
    box.appendChild(div);
  });
}

document.getElementById('addTrackToLesson').onclick=()=>{
  if(!currentTrack) return alert('Primeiro prepara ou seleciona uma música.');
  const snap=snapshotCurrentTrack();
  const existing=lessonTracks.findIndex(x=>x.track?.id===currentTrack.id);
  if(existing>=0){
    lessonTracks[existing]=snap;
    activeLessonIndex=existing;
  }else{
    lessonTracks.push(snap);
    activeLessonIndex=lessonTracks.length-1;
  }
  renderLesson();
};

document.getElementById('saveLesson').onclick=()=>{
  syncCurrentTrackIntoLesson();
  if(!lessonTracks.length) return alert('Ainda não adicionaste faixas à aula.');
  const data={type:'musicfit-lesson',version:1,name:'Aula MusicFit',tracks:lessonTracks};
  const b=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(b);
  a.download='Aula-MusicFit.json';
  a.click();
  URL.revokeObjectURL(a.href);
};

document.getElementById('loadLesson').onclick=()=>document.getElementById('loadLessonFile').click();
document.getElementById('loadLessonFile').onchange=async e=>{
  const f=e.target.files[0]; if(!f)return;
  try{
    const d=JSON.parse(await f.text());
    if(!Array.isArray(d.tracks)) throw new Error('Formato inválido');
    lessonTracks=d.tracks;
    activeLessonIndex=lessonTracks.length?0:-1;
    renderLesson();
    if(activeLessonIndex>=0) loadLessonTrack(activeLessonIndex,false);
  }catch(err){
    alert('Não consegui carregar esta aula.');
  }
};