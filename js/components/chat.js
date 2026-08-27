// ================================================================
// chat.js — Widget de chat 1:1 entre usuários (bolha flutuante)
// ================================================================

(function () {
  let _bubble = null;
  let _painel = null;
  let _aberto = false;
  let _conversaAtual = null;
  let _outroUsuario = null; // {uid, nome}
  let _cancelarEscutaInbox = null;
  let _cancelarEscutaMensagens = null;
  let _diretorio = {};
  let _inbox = {};

  function iniciar() {
    if (_bubble) return; // já iniciado nesta sessão
    _criarDom();
    _carregarDiretorio();
    _escutarInbox();
  }

  function _criarDom() {
    _bubble = document.createElement("button");
    _bubble.id = "chat-bubble";
    _bubble.className = "chat-bubble";
    _bubble.type = "button";
    _bubble.setAttribute("aria-label", "Abrir chat");
    _bubble.innerHTML = `
      <i data-lucide="message-circle" width="24" height="24" aria-hidden="true"></i>
      <span class="chat-badge" id="chat-badge" hidden>0</span>
    `;
    _bubble.addEventListener("click", _alternarPainel);
    document.body.appendChild(_bubble);

    _painel = document.createElement("div");
    _painel.id = "chat-painel";
    _painel.className = "chat-painel";
    _painel.hidden = true;
    document.body.appendChild(_painel);

    lucide.createIcons({ nodes: [_bubble] });
  }

  function _alternarPainel() {
    _aberto = !_aberto;
    _painel.hidden = !_aberto;
    if (_aberto) {
      if (_conversaAtual) {
        _renderConversa();
        // Reconstruir o painel troca o container de mensagens por um novo
        // vazio — reanexa o listener pra ele disparar de novo com os dados
        // atuais (o listener antigo continuava rodando, mas apontando pro
        // container antigo, que foi descartado).
        _escutarMensagens(_conversaAtual);
      } else {
        _renderLista();
      }
    }
  }

  async function _carregarDiretorio() {
    try {
      const snap = await lerUmaVez(CAMINHOS.diretorio());
      _diretorio = snap || {};
    } catch (err) {
      console.warn("[chat] Falha ao carregar diretório:", err);
    }
  }

  function _escutarInbox() {
    if (_cancelarEscutaInbox) _cancelarEscutaInbox();
    const meuUid = window.AppState.uid;
    _cancelarEscutaInbox = escutar(
      `${CAMINHOS.inbox()}/${meuUid}`,
      (snap) => {
        _inbox = snap || {};
        _atualizarBadge();
        if (_aberto && !_conversaAtual) _renderLista();
      },
      (err) => console.error("[chat] Erro ao carregar inbox:", err),
    );
  }

  function _naoLida(c) {
    return !c.lida_em || (c.ultimaAtualizacao || 0) > c.lida_em;
  }

  function _atualizarBadge() {
    const total = Object.values(_inbox).filter(_naoLida).length;
    const badge = document.getElementById("chat-badge");
    if (!badge) return;
    if (total > 0) {
      badge.textContent = total > 9 ? "9+" : String(total);
      badge.hidden = false;
    } else {
      badge.hidden = true;
    }
  }

  function _iniciais(nome) {
    if (!nome) return "?";
    const partes = nome.trim().split(/\s+/);
    return ((partes[0]?.[0] || "") + (partes[1]?.[0] || "")).toUpperCase();
  }

  function _escaparHtml(texto) {
    const div = document.createElement("div");
    div.textContent = texto || "";
    return div.innerHTML;
  }

  function _renderLista() {
    const meuUid = window.AppState.uid;
    const conversas = Object.entries(_inbox)
      .map(([id, c]) => ({ id, ...c }))
      .sort((a, b) => (b.ultimaAtualizacao || 0) - (a.ultimaAtualizacao || 0));

    const outrosUsuarios = Object.entries(_diretorio)
      .filter(([uid]) => uid !== meuUid)
      .map(([uid, d]) => ({ uid, nome: d.nome }))
      .sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));

    _painel.innerHTML = `
      <div class="chat-header">
        <span>Conversas</span>
        <button class="chat-icon-btn" aria-label="Fechar chat" id="chat-fechar-btn" type="button">
          <i data-lucide="x" width="18" height="18" aria-hidden="true"></i>
        </button>
      </div>
      <input type="text" id="chat-busca-usuario" class="chat-busca" placeholder="Buscar colega para conversar…" autocomplete="off">
      <div class="chat-lista" id="chat-lista">
        ${
          conversas.length === 0
            ? `<p class="chat-vazio">Nenhuma conversa ainda. Busque um colega acima para começar.</p>`
            : conversas
                .map(
                  (c) => `
          <button class="chat-item" type="button" data-uid="${c.comUid}" data-nome="${(c.comNome || "").replace(/"/g, "&quot;")}">
            <span class="chat-item-avatar">${_iniciais(c.comNome)}</span>
            <span class="chat-item-info">
              <strong>${c.comNome || "—"}</strong>
              <span class="chat-item-preview">${_escaparHtml(c.ultimaMensagem || "")}</span>
            </span>
            ${_naoLida(c) ? `<span class="chat-item-dot" aria-hidden="true"></span>` : ""}
          </button>
        `,
                )
                .join("")
        }
      </div>
      <div class="chat-lista chat-lista-usuarios" id="chat-lista-usuarios" hidden></div>
    `;
    lucide.createIcons({ nodes: [_painel] });

    document
      .getElementById("chat-fechar-btn")
      ?.addEventListener("click", _alternarPainel);

    _painel.querySelectorAll("#chat-lista .chat-item").forEach((btn) => {
      btn.addEventListener("click", () =>
        _abrirConversa(btn.dataset.uid, btn.dataset.nome),
      );
    });

    const inputBusca = document.getElementById("chat-busca-usuario");
    const listaUsuarios = document.getElementById("chat-lista-usuarios");
    const listaConversas = document.getElementById("chat-lista");
    inputBusca?.addEventListener("input", () => {
      const termo = inputBusca.value.trim().toLowerCase();
      if (!termo) {
        listaUsuarios.hidden = true;
        listaUsuarios.innerHTML = "";
        listaConversas.hidden = false;
        return;
      }
      listaConversas.hidden = true;
      const encontrados = outrosUsuarios.filter((u) =>
        (u.nome || "").toLowerCase().includes(termo),
      );
      listaUsuarios.hidden = false;
      listaUsuarios.innerHTML =
        encontrados.length === 0
          ? `<p class="chat-vazio">Ninguém encontrado.</p>`
          : encontrados
              .map(
                (u) => `
          <button class="chat-item" type="button" data-uid="${u.uid}" data-nome="${(u.nome || "").replace(/"/g, "&quot;")}">
            <span class="chat-item-avatar">${_iniciais(u.nome)}</span>
            <span class="chat-item-info"><strong>${u.nome || "—"}</strong></span>
          </button>
        `,
              )
              .join("");
      listaUsuarios.querySelectorAll(".chat-item").forEach((btn) => {
        btn.addEventListener("click", () =>
          _abrirConversa(btn.dataset.uid, btn.dataset.nome),
        );
      });
    });
  }

  async function _abrirConversa(outroUid, outroNome) {
    const meuUid = window.AppState.uid;
    const conversaId = idConversa(meuUid, outroUid);
    _conversaAtual = conversaId;
    _outroUsuario = { uid: outroUid, nome: outroNome };

    try {
      const existente = await lerUmaVez(CAMINHOS.conversa(conversaId));
      if (!existente) {
        await salvar(CAMINHOS.conversa(conversaId), {
          participantes: { [meuUid]: true, [outroUid]: true },
          criado_em: agora(),
        });
      }
      await atualizar(CAMINHOS.inboxConversa(meuUid, conversaId), {
        comUid: outroUid,
        comNome: outroNome,
        lida_em: agora(),
      });
    } catch (err) {
      console.error("[chat] Erro ao abrir conversa:", err);
      Alerts.erro("Erro ao abrir a conversa.");
      return;
    }

    _renderConversa();
    _escutarMensagens(conversaId);
  }

  function _renderConversa() {
    _painel.innerHTML = `
      <div class="chat-header">
        <button class="chat-icon-btn" aria-label="Voltar" id="chat-voltar-btn" type="button">
          <i data-lucide="arrow-left" width="18" height="18" aria-hidden="true"></i>
        </button>
        <span>${_escaparHtml(_outroUsuario?.nome || "")}</span>
        <button class="chat-icon-btn" aria-label="Fechar chat" id="chat-fechar-btn" type="button">
          <i data-lucide="x" width="18" height="18" aria-hidden="true"></i>
        </button>
      </div>
      <div class="chat-mensagens" id="chat-mensagens"></div>
      <form id="chat-form" class="chat-form" autocomplete="off">
        <input type="text" id="chat-input" class="chat-input" placeholder="Escreva uma mensagem…" maxlength="1000" />
        <button type="submit" class="chat-enviar" aria-label="Enviar mensagem">
          <i data-lucide="send" width="18" height="18" aria-hidden="true"></i>
        </button>
      </form>
    `;
    lucide.createIcons({ nodes: [_painel] });

    document.getElementById("chat-voltar-btn")?.addEventListener("click", () => {
      if (_cancelarEscutaMensagens) {
        _cancelarEscutaMensagens();
        _cancelarEscutaMensagens = null;
      }
      _conversaAtual = null;
      _outroUsuario = null;
      _renderLista();
    });
    document
      .getElementById("chat-fechar-btn")
      ?.addEventListener("click", _alternarPainel);
    document.getElementById("chat-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      _enviarMensagem();
    });
    document.getElementById("chat-input")?.focus();
  }

  function _escutarMensagens(conversaId) {
    if (_cancelarEscutaMensagens) _cancelarEscutaMensagens();
    _cancelarEscutaMensagens = escutar(
      CAMINHOS.mensagens(conversaId),
      (snap) => {
        const lista = snap
          ? Object.entries(snap)
              .map(([id, m]) => ({ id, ...m }))
              .sort((a, b) => (a.criado_em || 0) - (b.criado_em || 0))
          : [];
        _renderMensagens(lista);
      },
      (err) => console.error("[chat] Erro ao carregar mensagens:", err),
    );
  }

  function _renderMensagens(lista) {
    const container = document.getElementById("chat-mensagens");
    if (!container) return;
    const meuUid = window.AppState.uid;
    container.innerHTML = lista.length
      ? lista
          .map((m) => {
            const minha = m.remetente === meuUid;
            return `
      <div class="chat-msg-row ${minha ? "chat-msg-row-minha" : "chat-msg-row-outro"}">
        ${
          minha
            ? `<button class="chat-msg-excluir" type="button" data-id="${m.id}" aria-label="Excluir mensagem">
                <i data-lucide="trash-2" width="13" height="13" aria-hidden="true"></i>
              </button>`
            : ""
        }
        <div class="chat-msg ${minha ? "chat-msg-minha" : "chat-msg-outro"}">
          <p>${_escaparHtml(m.texto)}</p>
        </div>
      </div>
    `;
          })
          .join("")
      : `<p class="chat-vazio">Nenhuma mensagem ainda. Diga oi!</p>`;
    lucide.createIcons({ nodes: [container] });
    container.querySelectorAll(".chat-msg-excluir").forEach((btn) => {
      btn.addEventListener("click", () => _excluirMensagem(btn.dataset.id));
    });
    container.scrollTop = container.scrollHeight;

    // Se a conversa está aberta e chegou mensagem nova, marca como lida
    if (_conversaAtual && _aberto) {
      atualizar(CAMINHOS.inboxConversa(window.AppState.uid, _conversaAtual), {
        lida_em: agora(),
      }).catch(() => {});
    }
  }

  async function _excluirMensagem(msgId) {
    if (!_conversaAtual || !msgId) return;
    try {
      await remover(`${CAMINHOS.mensagens(_conversaAtual)}/${msgId}`);
    } catch (err) {
      console.error("[chat] Erro ao excluir mensagem:", err);
      Alerts.erro("Erro ao excluir mensagem.");
    }
  }

  async function _enviarMensagem() {
    const input = document.getElementById("chat-input");
    const texto = input?.value.trim();
    if (!texto || !_conversaAtual || !_outroUsuario) return;
    input.value = "";

    const meuUid = window.AppState.uid;
    const meuNome = window.AppState.nome;
    const conversaId = _conversaAtual;
    const outroUid = _outroUsuario.uid;
    const outroNome = _outroUsuario.nome;
    const agoraTs = agora();

    try {
      await criar(CAMINHOS.mensagens(conversaId), {
        remetente: meuUid,
        texto,
      });
      await atualizar(CAMINHOS.inboxConversa(meuUid, conversaId), {
        comUid: outroUid,
        comNome: outroNome,
        ultimaMensagem: texto,
        ultimaAtualizacao: agoraTs,
        lida_em: agoraTs,
      });
      await atualizar(CAMINHOS.inboxConversa(outroUid, conversaId), {
        comUid: meuUid,
        comNome: meuNome,
        ultimaMensagem: texto,
        ultimaAtualizacao: agoraTs,
      });
    } catch (err) {
      console.error("[chat] Erro ao enviar mensagem:", err);
      Alerts.erro("Erro ao enviar mensagem.");
    }
  }

  window.Chat = { iniciar };
})();
