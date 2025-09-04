document.addEventListener('DOMContentLoaded', function() {
  const containerViagens = document.getElementById('containerViagens');
  const botoesFiltro = document.querySelectorAll('.botao-filtro');
  const botaoGrade = document.getElementById('botaoGrade');
  const campoPesquisa = document.getElementById('campoPesquisa');
  const filtroRetornoHoje = document.getElementById('filtroRetornoHoje');
  const controlesCarrossel = document.getElementById('controlesCarrossel');
  const contadorCarrossel = document.getElementById('contadorCarrossel');
  
  // Elementos do modal
  const modal = document.getElementById('modalViagem');
  const modalFechar = document.getElementById('modalFechar');
  const modalTitulo = document.getElementById('modalTitulo');
  const modalCodigo = document.getElementById('modalCodigo');
  const modalPlaca = document.getElementById('modalPlaca');
  const modalDestino = document.getElementById('modalDestino');
  const modalSaida = document.getElementById('modalSaida');
  const modalChegada = document.getElementById('modalChegada');
  const modalStatus = document.getElementById('modalStatus');
  const modalAtualizacao = document.getElementById('modalAtualizacao');
  const modalProgresso = document.getElementById('modalProgresso');
  const mapaRastro = document.getElementById('mapaRastro');
  const timelineLista = document.getElementById('timelineLista');
  
  // Variável para armazenar o mapa Leaflet
  let mapa = null;
  let rastroViagem = null;
  
  // Variável para armazenar as viagens
  let viagens = [];
  
  // Função para carregar o JSON
  async function carregarViagens() {
    try {
      const response = await fetch('viagens.json');
      if (!response.ok) {
        throw new Error('Erro ao carregar os dados das viagens');
      }
      viagens = await response.json();
      renderizarViagens();
      iniciarCarrosselAutomatico();
    } catch (error) {
      console.error('Erro:', error);
      containerViagens.innerHTML = '<p>Erro ao carregar as viagens. Por favor, recarregue a página.</p>';
    }
  }
  
  // Função para verificar se a viagem é um retorno com previsão para hoje
  function isRetornoParaHoje(viagem) {
    if (viagem.tipo !== 'retorno') return false;
    
    // Extrai a data da string de chegada (formato "DD/MM - HH:mm")
    const dataChegada = viagem.chegada.split(' - ')[0];
    
    // Obtém a data de hoje no formato "DD/MM"
    const hoje = new Date();
    const dia = String(hoje.getDate()).padStart(2, '0');
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const hojeFormatado = `${dia}/${mes}`;
    
    return dataChegada === hojeFormatado;
  }
  
  // Função para filtrar viagens
  function filtrarViagens() {
    return viagens.filter(viagem => {
      // Aplica o filtro de tipo (todos, ida ou retorno)
      const passaFiltroTipo = filtroAtual === 'todos' || viagem.tipo === filtroAtual;
      
      // Aplica o filtro de pesquisa (se houver termo)
      const passaFiltroPesquisa = termoPesquisa === '' || 
        viagem.destino.toLowerCase().includes(termoPesquisa.toLowerCase()) || 
        viagem.placa.toLowerCase().includes(termoPesquisa.toLowerCase());
      
      // Aplica o filtro de retornos para hoje (se ativado)
      const passaFiltroRetornoHoje = !mostrarRetornosHoje || 
        (mostrarRetornosHoje && isRetornoParaHoje(viagem));
      
      return passaFiltroTipo && passaFiltroPesquisa && passaFiltroRetornoHoje;
    });
  }
  
  // Função para determinar a classe das flechas com base no progresso
  function getClasseFlechas(progresso) {
    if (progresso > 80) return 'flechas-1';
    if (progresso > 60) return 'flechas-2';
    if (progresso > 40) return 'flechas-3';
    return ''; // padrão (4 flechas)
  }
  
  // Função para gerar coordenadas aleatórias para simular o rastro
  function gerarCoordenadasRastro(viagem) {
    // Coordenadas aproximadas de Minas Gerais (ponto central)
    const centroLat = -18.5122;
    const centroLng = -44.5550;
    
    const rastro = [];
    const numPontos = 8 + Math.floor(Math.random() * 7); // Entre 8 e 15 pontos
    
    // Ponto de partida (ligeiramente aleatório em torno do centro)
    const latInicial = centroLat + (Math.random() * 2 - 1);
    const lngInicial = centroLng + (Math.random() * 2 - 1);
    rastro.push([latInicial, lngInicial]);
    
    // Gerar pontos intermediários
    for (let i = 1; i < numPontos - 1; i++) {
      const progresso = i / (numPontos - 1);
      const variacao = 0.5 * (1 - progresso); // Reduz a variação conforme se aproxima do destino
      
      const lat = latInicial + (Math.random() * variacao - variacao/2);
      const lng = lngInicial + (Math.random() * variacao - variacao/2) + progresso * 2;
      rastro.push([lat, lng]);
    }
    
    // Ponto final (mais próximo do centro)
    rastro.push([centroLat + (Math.random() * 0.5 - 0.25), centroLng + (Math.random() * 0.5 - 0.25)]);
    
    return rastro;
  }
  
  // Função para gerar histórico de posições com base no rastro
  function gerarHistoricoPosicoes(viagem, rastroCoordenadas) {
    const historico = [];
    const numPontos = rastroCoordenadas.length;
    
    // Converter string de saída para objeto Date (assumindo ano atual)
    const [diaSaida, mesSaida] = viagem.saida.split(' - ')[0].split('/');
    const [horaSaida, minutoSaida] = viagem.saida.split(' - ')[1].split(':');
    const dataSaida = new Date(new Date().getFullYear(), parseInt(mesSaida) - 1, parseInt(diaSaida), 
                              parseInt(horaSaida), parseInt(minutoSaida));
    
    // Calcular tempo total estimado da viagem em milissegundos
    const [horaChegada, minutoChegada] = viagem.chegada.split(' - ')[1].split(':');
    const dataChegada = new Date(new Date().getFullYear(), parseInt(mesSaida) - 1, parseInt(diaSaida), 
                                parseInt(horaChegada), parseInt(minutoChegada));
    const duracaoTotal = dataChegada - dataSaida;
    
    // Gerar histórico para cada ponto
    for (let i = 0; i < numPontos; i++) {
      const progresso = i / (numPontos - 1);
      const timestamp = new Date(dataSaida.getTime() + progresso * duracaoTotal);
      
      // Formatar hora
      const horas = String(timestamp.getHours()).padStart(2, '0');
      const minutos = String(timestamp.getMinutes()).padStart(2, '0');
      
      // Gerar descrição baseada no progresso
      let descricao;
      if (i === 0) {
        descricao = "Partida do pátio";
      } else if (i === numPontos - 1) {
        descricao = "Chegada ao destino";
      } else if (progresso < 0.3) {
        descricao = "Início da viagem";
      } else if (progresso < 0.7) {
        descricao = "Em trânsito";
      } else {
        descricao = "Aproximando do destino";
      }
      
      // Adicionar localização aleatória baseada em cidades de MG
      const cidadesMG = [
        "Uberaba", "Araxá", "Patos de Minas", "Uberlândia", "Patrocínio", 
        "Monte Carmelo", "Sacramento", "Perdizes", "Araguari", "Coromandel",
        "Campos Altos", "Ibiá", "Tapira", "Carmo do Paranaíba", "Lagoa Formosa",
        "São Gotardo", "Piumhi", "Serra da Canastra", "Estrada MG-230", "BR-050",
        "Estrada rural", "BR-354", "Próximo ao destino", "Próximo à cidade"
      ];
      
      const localizacao = cidadesMG[Math.floor(Math.random() * cidadesMG.length)];
      
      historico.push({
        hora: `${horas}:${minutos}`,
        localizacao: localizacao,
        descricao: descricao,
        progresso: Math.round(progresso * 100)
      });
    }
    
    return historico;
  }
  
  // Função para abrir o modal com os detalhes da viagem (versão compacta)
  function abrirModalViagem(viagem) {
    // Preencher informações básicas no formato compacto
    modalTitulo.textContent = `Viagem ${viagem.codigo}`;
    
    // Gerar rastro e histórico de posições
    const rastroCoordenadas = gerarCoordenadasRastro(viagem);
    const historicoPosicoes = gerarHistoricoPosicoes(viagem, rastroCoordenadas);
    
    // Renderizar histórico na timeline
    timelineLista.innerHTML = '';
    historicoPosicoes.forEach(posicao => {
      const item = document.createElement('div');
      item.className = `timeline-item ${viagem.tipo}`;
      item.innerHTML = `
        <div>
          <span class="timeline-hora">${posicao.hora}</span>
          <span>${posicao.localizacao}</span>
        </div>
        <div>${posicao.descricao} (${posicao.progresso}%)</div>
      `;
      timelineLista.appendChild(item);
    });
    
    // Atualizar o conteúdo do modal com layout compacto
    document.querySelector('.modal-corpo').innerHTML = `
      <div class="info-viagem-modal-compacta">
        <div class="info-item-compacta">
          <span class="info-label-compacta">Código:</span>
          <span class="info-value-compacta">${viagem.codigo}</span>
        </div>
        <div class="info-item-compacta">
          <span class="info-label-compacta">Placa:</span>
          <span class="info-value-compacta">${viagem.placa}</span>
        </div>
        <div class="info-item-compacta">
          <span class="info-label-compacta">Destino:</span>
          <span class="info-value-compacta">${viagem.destino}</span>
        </div>
        <div class="info-item-compacta">
          <span class="info-label-compacta">Saída:</span>
          <span class="info-value-compacta">${viagem.saida}</span>
        </div>
        <div class="info-item-compacta">
          <span class="info-label-compacta">Previsão de Chegada:</span>
          <span class="info-value-compacta">${viagem.chegada}</span>
        </div>
        <div class="info-item-compacta">
          <span class="info-label-compacta">Status:</span>
          <span class="info-value-compacta">${viagem.status === 'em-transito' ? 'EM TRÂNSITO' : 'EM RETORNO'}</span>
        </div>
        <div class="info-item-compacta">
          <span class="info-label-compacta">Última Atualização:</span>
          <span class="info-value-compacta">${viagem.atualizacao}</span>
        </div>
        <div class="info-item-compacta">
          <span class="info-label-compacta">Progresso:</span>
          <span class="info-value-compacta">${viagem.progresso}%</span>
        </div>
      </div>
      
      <div class="mapa-container">
        <div id="mapaRastro" class="mapa-rastro"></div>
      </div>
      
      <div class="timeline-viagem">
        <h3>Histórico de Posições</h3>
        <div id="timelineLista" class="timeline-lista">
          <!-- Itens da timeline serão inseridos aqui -->
        </div>
      </div>
    `;
    
    // Reinserir a timeline que já foi preenchida
    const novaTimelineLista = document.getElementById('timelineLista');
    novaTimelineLista.innerHTML = timelineLista.innerHTML;
    
    // Inicializar o mapa APÓS o elemento estar no DOM
    setTimeout(() => {
      // Inicializar ou redefinir o mapa
      if (mapa) {
        mapa.remove();
      }
      
      // Certificar-se de que o elemento do mapa existe
      const mapaElement = document.getElementById('mapaRastro');
      if (mapaElement) {
        mapa = L.map('mapaRastro').setView(rastroCoordenadas[0], 7);
        
        // Adicionar camada do mapa
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(mapa);
        
        // Adicionar marcador de início
        L.marker(rastroCoordenadas[0])
          .addTo(mapa)
          .bindPopup('Ponto de Partida: ' + viagem.pontoInicio)
          .openPopup();
        
        // Adicionar marcador de fim
        L.marker(rastroCoordenadas[rastroCoordenadas.length - 1])
          .addTo(mapa)
          .bindPopup('Ponto de Chegada: ' + viagem.pontoFim);
        
        // Adicionar linha do rastro
        if (rastroViagem) {
          mapa.removeLayer(rastroViagem);
        }
        
        rastroViagem = L.polyline(rastroCoordenadas, {
          color: viagem.tipo === 'ida' ? '#5499db' : '#7eb67d',
          weight: 4,
          opacity: 0.7
        }).addTo(mapa);
        
        // Ajustar a visualização para mostrar todo o rastro
        mapa.fitBounds(rastroViagem.getBounds());
      }
    }, 100);
    
    // Mostrar o modal
    modal.style.display = 'block';
    
    // Reatribuir o evento de fechar (pois o conteúdo foi substituído)
    document.getElementById('modalFechar').addEventListener('click', function() {
      modal.style.display = 'none';
    });
  }
  
  // Fechar o modal quando clicar no X
  modalFechar.addEventListener('click', function() {
    modal.style.display = 'none';
  });
  
  // Fechar o modal quando clicar fora dele
  window.addEventListener('click', function(event) {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  });
  
  // Variáveis para controle
  let filtroAtual = 'todos';
  let termoPesquisa = '';
  let modoVisualizacao = 0; // 0=2col, 1=3col, 2=4col
  let mostrarRetornosHoje = false;
  let paginaAtual = 0;
  let intervaloCarrossel;
  let viagensPorPagina = 8; // Padrão para 2 colunas (2x4)
  
  // Função para renderizar as viagens (com paginação)
  function renderizarViagens() {
    containerViagens.innerHTML = '';
    
    const viagensFiltradas = filtrarViagens();
    const totalPaginas = Math.ceil(viagensFiltradas.length / viagensPorPagina);
    
    // Ajusta a página atual se necessário
    if (paginaAtual >= totalPaginas && totalPaginas > 0) {
      paginaAtual = totalPaginas - 1;
    } else if (totalPaginas === 0) {
      paginaAtual = 0;
    }
    
    // Calcula o índice de início e fim para a página atual
    const inicio = paginaAtual * viagensPorPagina;
    const fim = inicio + viagensPorPagina;
    const viagensPagina = viagensFiltradas.slice(inicio, fim);
    
    // Renderiza as viagens da página atual
    viagensPagina.forEach(viagem => {
      const viagemElement = document.createElement('div');
      viagemElement.className = `viagem ${viagem.tipo}`;
      
      const classeFlechas = getClasseFlechas(viagem.progresso);
      
      viagemElement.innerHTML = `
        <div class="destino">Destino: ${viagem.destino}</div>
        <div class="info-topo">
          <div class="codigo">${viagem.codigo} <span class="placa">${viagem.placa}</span></div>
          <div class="datas">
            <span>Saída: ${viagem.saida}</span>
            <span>Prev. chegada: ${viagem.chegada}</span>
          </div>
          <div class="status ${viagem.status}">${viagem.status === 'em-transito' ? 'EM TRÂNSITO' : 'EM RETORNO'}</div>
        </div>
        <div class="linha-progresso">
          <div class="ponto inicio"><div class="nome">${viagem.pontoInicio}</div><div class="hora">${viagem.pontoInicioHora}</div></div>
          <div class="barra ${viagem.tipo}" style="--progresso: ${viagem.progresso}%">
            <div class="bolinha-atual ${classeFlechas}"></div>
            <div class="ultima-atualizacao">Atualizado: ${viagem.atualizacao}</div>
          </div>
          <div class="ponto fim"><div class="nome">${viagem.pontoFim}</div><div class="hora">${viagem.pontoFimHora}</div></div>
        </div>
      `;
      
      // Adicionar evento de clique para abrir o modal
      viagemElement.addEventListener('click', function() {
        abrirModalViagem(viagem);
      });
      
      containerViagens.appendChild(viagemElement);
    });
    
    // Atualiza os controles do carrossel
    atualizarControlesCarrossel(viagensFiltradas.length);
    
    // Atualiza o contador
    atualizarContadorCarrossel(viagensFiltradas.length);
  }
  
  // Função para atualizar os controles do carrossel
  function atualizarControlesCarrossel(totalViagens) {
    controlesCarrossel.innerHTML = '';
    const totalPaginas = Math.ceil(totalViagens / viagensPorPagina);
    
    if (totalPaginas <= 1) return;
    
    for (let i = 0; i < totalPaginas; i++) {
      const botao = document.createElement('button');
      botao.className = `botao-carrossel ${i === paginaAtual ? 'ativo' : ''}`;
      botao.textContent = i + 1;
      botao.addEventListener('click', () => {
        paginaAtual = i;
        renderizarViagens();
        reiniciarIntervaloCarrossel();
      });
      controlesCarrossel.appendChild(botao);
    }
  }
  
  // Função para atualizar o contador do carrossel
  function atualizarContadorCarrossel(totalViagens) {
    const totalPaginas = Math.ceil(totalViagens / viagensPorPagina);
    
    if (totalViagens === 0) {
      contadorCarrossel.textContent = 'Nenhuma viagem encontrada';
      return;
    }
    
    const inicio = paginaAtual * viagensPorPagina + 1;
    const fim = Math.min((paginaAtual + 1) * viagensPorPagina, totalViagens);
    
    contadorCarrossel.textContent = `Mostrando ${inicio}-${fim} de ${totalViagens} viagens (página ${paginaAtual + 1} de ${totalPaginas})`;
  }
  
  // Função para avançar para a próxima página do carrossel
  function avancarPagina() {
    const viagensFiltradas = filtrarViagens();
    const totalPaginas = Math.ceil(viagensFiltradas.length / viagensPorPagina);
    
    if (totalPaginas <= 1) return;
    
    paginaAtual = (paginaAtual + 1) % totalPaginas;
    renderizarViagens();
  }
  
  // Função para reiniciar o intervalo do carrossel
  function reiniciarIntervaloCarrossel() {
    clearInterval(intervaloCarrossel);
    iniciarCarrosselAutomatico();
  }
  
  // Função para iniciar o carrossel automático
  function iniciarCarrosselAutomatico() {
    intervaloCarrossel = setInterval(avancarPagina, 30000); // Avança a cada minuto
  }
  
  // Eventos dos botões de filtro
  botoesFiltro.forEach(botao => {
    botao.addEventListener('click', function() {
      botoesFiltro.forEach(b => b.classList.remove('ativo'));
      this.classList.add('ativo');
      filtroAtual = this.getAttribute('data-filtro');
      paginaAtual = 0; // Reset para primeira página
      renderizarViagens();
      reiniciarIntervaloCarrossel();
    });
  });
  
  // Evento do campo de pesquisa
  campoPesquisa.addEventListener('input', function() {
    termoPesquisa = this.value.trim();
    paginaAtual = 0; // Reset para primeira página
    renderizarViagens();
    reiniciarIntervaloCarrossel();
  });
  
  // Evento do checkbox de retornos para hoje
  filtroRetornoHoje.addEventListener('change', function() {
    mostrarRetornosHoje = this.checked;
    paginaAtual = 0; // Reset para primeira página
    renderizarViagens();
    reiniciarIntervaloCarrossel();
  });
  
  // Evento do botão de visualização
  botaoGrade.addEventListener('click', function() {
    // Alterna entre os modos de visualização
    modoVisualizacao = (modoVisualizacao + 1) % 3;
    
    // Remove todas as classes de colunas
    containerViagens.classList.remove('tres-colunas', 'quatro-colunas');
    
    // Adiciona a classe correspondente ao modo atual
    if (modoVisualizacao === 1) {
      containerViagens.classList.add('tres-colunas');
      viagensPorPagina = 12; // 3 colunas x 4 linhas
    } else if (modoVisualizacao === 2) {
      containerViagens.classList.add('quatro-colunas');
      viagensPorPagina = 16; // 4 colunas x 4 linhas
    } else {
      viagensPorPagina = 8; // 2 colunas x 4 linhas
    }
    
    paginaAtual = 0; // Reset para primeira página
    renderizarViagens();
    reiniciarIntervaloCarrossel();
  });
  
  // Carrega as viagens do arquito JSON
  carregarViagens();
});


