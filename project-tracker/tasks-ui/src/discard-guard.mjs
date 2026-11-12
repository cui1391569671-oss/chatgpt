// Shared by React editors and the native-dialog adapter. Read live form state
// again after confirmation so a late request cannot close a saving/closed editor.
export function createDiscardGuard({hasChanges,isBusy,close,confirm,isActive=()=>true}){
 let pending=null;
 return {
  requestClose(){
   if(!isActive()||isBusy())return Promise.resolve(false);
   if(pending)return pending;
   pending=Promise.resolve().then(async()=>{
    if(hasChanges()&&!await confirm())return false;
    if(!isActive()||isBusy())return false;
    close();return true;
   }).finally(()=>{pending=null;});
   return pending;
  },
  beforeUnload(event){
   if(isActive()&&(isBusy()||hasChanges())){event.preventDefault();event.returnValue='';}
  }
 };
}
