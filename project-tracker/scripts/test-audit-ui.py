import importlib.util, sys, tempfile, unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('adapter',Path(__file__).with_name('audit-ui.py'));adapter=importlib.util.module_from_spec(spec);spec.loader.exec_module(adapter)
api=adapter.load_auditor(adapter.DEFAULT_AUDITOR);adapter.install_adapter(api)
class AuditAdapterTests(unittest.TestCase):
 def findings(self,text,suffix='.html'):
  with tempfile.TemporaryDirectory() as folder:
   root=Path(folder);(root/('fixture'+suffix)).write_text(text,encoding='utf-8')
   return [f.rule_id for f in api.inspect_source(root,{})]
 def test_dead_button_still_fails(self):
  self.assertIn('affordance.actionless-button',self.findings('<button id="save">Save</button>'))
 def test_direct_and_aliased_binding(self):
  for binding in ["document.getElementById('save').onclick=save;", "const other=1,button=document.querySelector('#save');button.addEventListener('click',save);"]:
   self.assertNotIn('affordance.actionless-button',self.findings('<button id="save">Save</button><script>'+binding+'</script>'))
 def test_unrelated_binding_does_not_hide_button(self):
  self.assertIn('affordance.actionless-button',self.findings('<button id="save">Save</button><script>document.getElementById("other").onclick=save;</script>'))
 def test_delegated_attribute_is_exact(self):
  script="<script>document.querySelector('nav').onclick=e=>{const b=e.target.closest('button[data-view]');if(b)navigate(b.dataset.view);};</script>"
  self.assertNotIn('affordance.actionless-button',self.findings('<button data-view="home">Home</button>'+script))
  self.assertIn('affordance.actionless-button',self.findings('<button data-delete="1">Delete</button>'+script))
 def test_jsx_component_is_not_native(self):
  self.assertEqual([],self.findings("export const View=()=> <Select/>;",'.tsx'))
  self.assertIn('affordance.actionless-button',self.findings("export const View=()=> <button>Save</button>;",'.tsx'))
 def test_native_ownership_still_required(self):
  self.assertIn('ownership.native-select-undecided',self.findings('<select></select>'))
  self.assertIn('ownership.native-date-undecided',self.findings('<input type="date">'))
 def test_verified_adapter_only_covers_supported_fields(self):
  install='<script>window.WorkspacePrimitives.install();</script>'
  self.assertNotIn('ownership.native-select-undecided',self.findings('<select></select>'+install))
  self.assertIn('ownership.native-select-undecided',self.findings('<select multiple></select>'+install))
  self.assertIn('ownership.native-date-undecided',self.findings('<input type="time">'+install))
if __name__=='__main__':unittest.main()
