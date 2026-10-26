// Shared file-picker adapter. Preserve the actual input, listeners and file validation.
const triggers=new WeakMap();
export function enhanceFileInput(input){
 if(triggers.has(input))return triggers.get(input);
 if(input.dataset.workspaceFileTriggerId){const button=input.ownerDocument.getElementById(input.dataset.workspaceFileTriggerId);if(button)return {button,observer:null};}
 const label=input.labels?.[0],button=input.ownerDocument.createElement('button');
 button.type='button';button.className='workspace-file-trigger';button.dataset.uiControl='button';
 button.id=(input.id||'file-'+crypto.randomUUID())+'-control';input.dataset.workspaceFileTriggerId=button.id;
 button.textContent=input.dataset.fileTriggerLabel||(label?.classList.contains('btn')?label.textContent.trim():input.multiple?'选择图片':'选择文件');
 button.setAttribute('aria-label',button.textContent);
 const after=label?.classList.contains('btn')?label:input;
 after.after(button);if(after!==input){after.hidden=true;after.dataset.workspaceFileNative='';after.classList.remove('btn');}
 input.hidden=true;input.dataset.workspaceFileNative='';input.tabIndex=-1;
 button.addEventListener('click',()=>{if(!input.matches(':disabled'))input.click();});
 const sync=()=>{button.disabled=input.matches(':disabled');button.setAttribute('aria-required',String(input.required));};
 const observer=new MutationObserver(sync);observer.observe(input,{attributes:true,attributeFilter:['disabled','required']});const fieldset=input.closest('fieldset');if(fieldset)observer.observe(fieldset,{attributes:true,attributeFilter:['disabled']});sync();
 const result={button,observer};triggers.set(input,result);return result;
}
