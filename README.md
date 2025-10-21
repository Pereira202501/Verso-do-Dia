# Verso do Dia — Site simples

Site estático em HTML/CSS/JS que apresenta um verso bíblico por dia com reflexão e opções para copiar ou compartilhar no WhatsApp.

Como funciona
- O arquivo `verses.json` contém uma lista de versos e reflexões.
- O JavaScript escolhe o verso com base no dia do ano (rotaciona pela lista).
- Botões: copiar para área de transferência, compartilhar no WhatsApp e avançar para o próximo verso.

Como testar localmente
1. Abra o `index.html` no navegador (arrastar para o navegador funciona). Para funcionalidades de `fetch` em `file://` em alguns navegadores, use um servidor local.
2. Sugestão: instalar a extensão Live Server no VS Code e abrir a pasta. Ou rodar um servidor simples com Python:

```powershell
python -m http.server 5500; # abra http://localhost:5500/
```

Personalização
- Adicione/edite entradas em `verses.json` (cada item precisa de `reference`, `text`, `reflection`).

Licença
Use como quiser. Conteúdo presente pode ser editado para sua preferência.
