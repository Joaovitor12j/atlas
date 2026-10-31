// Contrato D-Bus entre o app/daemon do ATLAS e o shim (extensão). Sem imports: serve aos dois lados e ao node.
export const NOME = 'dev.joaovitor12j.Atlas';
export const CAMINHO = '/dev/joaovitor12j/Atlas';
export const INTERFACE = 'dev.joaovitor12j.Atlas1';
// Sobe a cada mudança incompatível; o shim ignora um daemon de versão diferente.
export const VERSAO = 1;

export const XML = `<node>
  <interface name="${INTERFACE}">
    <method name="Versao"><arg type="u" direction="out"/></method>
    <method name="Assinar"><arg type="s" direction="in" name="id"/></method>
    <method name="Soltar"><arg type="s" direction="in" name="id"/></method>
    <signal name="Dado"><arg type="s" name="id"/><arg type="s" name="json"/></signal>
  </interface>
</node>`;
