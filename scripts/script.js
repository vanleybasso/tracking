


    document.addEventListener('DOMContentLoaded', function() {
      const containerViagens = document.getElementById('containerViagens');
      const botoesFiltro = document.querySelectorAll('.botao-filtro');
      const botaoGrade = document.getElementById('botaoGrade');
      const campoPesquisa = document.getElementById('campoPesquisa');
      const filtroRetornoHoje = document.getElementById('filtroRetornoHoje');
      const controlesCarrossel = document.getElementById('controlesCarrossel');
      const contadorCarrossel = document.getElementById('contadorCarrossel');
      
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
      
      // Carrega as viagens do arquivo JSON
      carregarViagens();
    });
  