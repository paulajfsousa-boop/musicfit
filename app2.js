function renderCues(){
  cues.sort((a,b)=>a.time-b.time);
  const tb=document.getElementById('cueTable');
  tb.innerHTML='';
  cues.forEach((c,i)=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`
      <td colspan="3">
        <div class="editcue">
          <input class="cue-time-edit" type="number" step="0.1" min="0" value="${Number(c.time).toFixed(1)}">
          <input class="cue-name-edit" type="text" value="${escAttr(c.name)}">
          <div class="controls" style="margin-top:0">
            <button class="save-cue secondary">Guardar</button>
            <button class="delete-cue danger">Apagar</button>
          </div>
        </div>
      </td>`;
    const timeInput=tr.querySelector('.cue-time-edit');
    const nameInput=tr.querySelector('.cue-name-edit');
    tr.querySelector('.save-cue').onclick=()=>{
      const newTime=parseFloat(timeInput.value);
      const newName=nameInput.value.trim();
      if(!isFinite(newTime)||!newName) return alert('Indica um tempo e um nome de exercício válidos.');
      cues[i]={time:newTime,name:newName};
      cues.sort((a,b)=>a.time-b.time);
      renderCues();
      syncCurrentTrackIntoLesson();
      updateRun();
    };
    tr.querySelector('.delete-cue').onclick=()=>{
      cues.splice(i,1);
      renderCues();
      syncCurrentTrackIntoLesson();
      updateRun();
    };
    tb.appendChild(tr);
  });
}
function escAttr(s){
  return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
document.getElementById('markNow').onclick=()=>document.getElementById('cueTime').value=currentPosition.toFixed(1);
document.getElementById('bpmInput').addEventListener('input',e=>{
  const v=parseFloat(e.target.value);
  trackBpm=isFinite(v)?v:null;
  updateRun();
});
document.getElementById('addCue').onclick=()=>{
  const name=document.getElementById('exercise').value.trim(), time=parseFloat(document.getElementById('cueTime').value);
  if(!name||!isFinite(time))return alert('Escreve o exercício e marca o tempo.');
  cues.push({time,name});document.getElementById('exercise').value='';renderCues();syncCurrentTrackIntoLesson();
};
document.getElementById('clearCues').onclick=()=>{if(confirm('Apagar todos os cues?')){cues=[];renderCues();syncCurrentTrackIntoLesson();}};
document.getElementById('savePlan').onclick=()=>{
  const data={version:3,track:currentTrack,bpm:trackBpm,cues};const b=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=(currentTrack?.name||'musicfit')+'-cues.json';a.click();URL.revokeObjectURL(a.href);
};
document.getElementById('loadPlan').onclick=()=>document.getElementById('loadPlanFile').click();
document.getElementById('loadPlanFile').onchange=async e=>{
  const f=e.target.files[0];if(!f)return;const d=JSON.parse(await f.text());cues=d.cues||[];currentTrack=d.track||currentTrack;trackBpm=d.bpm||null;document.getElementById('bpmInput').value=trackBpm||'';renderCues();showTrack();updateRun();
};

function snapshotCurrentTrack(){
  if(!currentTrack) return null;
  return {
    track:{...currentTrack},
    bpm:trackBpm||null,
    cues:cues.map(c=>({time:Number(c.time),name:c.name}))
  };
}

function syncCurrentTrackIntoLesson(){
  if(activeLessonIndex<0 || activeLessonIndex>=lessonTracks.length) return;
  const snap=snapshotCurrentTrack();
  if(!snap) return;
  const existing=lessonTracks[activeLessonIndex];
  if(existing && existing.track && currentTrack && existing.track.id===currentTrack.id){
    lessonTracks[activeLessonIndex]=snap;
    renderLesson();
  }
}