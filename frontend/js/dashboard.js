const API_BASE_URL = "";

const correnteAtualEl = document.getElementById("correnteAtual");
const potenciaAtualEl = document.getElementById("potenciaAtual");
const consumoTotalEl = document.getElementById("consumoTotal");
const valorEstimadoEl = document.getElementById("valorEstimado");

const statusIndicadorEl = document.getElementById("statusIndicador");
const statusTextoEl = document.getElementById("statusTexto");

const tabelaLeiturasEl = document.getElementById("tabelaLeituras");
const graficoCanvas = document.getElementById("graficoPotencia");

const filtroBtns = document.querySelectorAll(".filtro-btn");
const descricaoFiltroGraficoEl = document.getElementById("descricaoFiltroGrafico");

const leiturasPeriodoEl = document.getElementById("leiturasPeriodo");
const potenciaMediaPeriodoEl = document.getElementById("potenciaMediaPeriodo");
const consumoPeriodoEl = document.getElementById("consumoPeriodo");
const custoPeriodoEl = document.getElementById("custoPeriodo");

const formConfiguracoesEl = document.getElementById("formConfiguracoes");
const inputNomeUsuarioEl = document.getElementById("inputNomeUsuario");
const inputTarifaKwhEl = document.getElementById("inputTarifaKwh");

const nomeUsuarioTopoEl = document.getElementById("nomeUsuarioTopo");
const tarifaAtualTopoEl = document.getElementById("tarifaAtualTopo");
const previewNomeUsuarioEl = document.getElementById("previewNomeUsuario");
const previewTarifaKwhEl = document.getElementById("previewTarifaKwh");

const tituloPaginaEl = document.getElementById("titulo-pagina-dinamico");
const subtituloPaginaEl = document.getElementById("subtitulo-pagina-dinamico");

let graficoPotencia = null;
let leiturasGlobais = [];
let filtroAtual = "ao-vivo";

const configuracoes = {
  nomeUsuario: localStorage.getItem("wattwise_nome_usuario") || "Usuário",
  tarifaKwh: Number(localStorage.getItem("wattwise_tarifa_kwh")) || 0.85
};

function formatarNumero(valor, casas = 2) {
  const numero = Number(valor || 0);

  return numero.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas
  });
}

function formatarMoeda(valor) {
  const numero = Number(valor || 0);

  return numero.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function formatarData(dataBanco) {
  if (!dataBanco) {
    return "--";
  }

  const data = new Date(String(dataBanco).replace(" ", "T"));

  if (isNaN(data.getTime())) {
    return dataBanco;
  }

  return data.toLocaleString("pt-BR");
}

function obterDataLeitura(leitura) {
  const valorData = leitura.criado_em || leitura.data_hora;

  if (!valorData) {
    return null;
  }

  const data = new Date(String(valorData).replace(" ", "T"));

  if (isNaN(data.getTime())) {
    return null;
  }

  return data;
}

function atualizarStatusApi(online) {
  if (online) {
    statusIndicadorEl.classList.remove("offline");
    statusIndicadorEl.classList.add("online");
    statusTextoEl.textContent = "API conectada";
  } else {
    statusIndicadorEl.classList.remove("online");
    statusIndicadorEl.classList.add("offline");
    statusTextoEl.textContent = "API offline";
  }
}

async function buscarResumo() {
  const resposta = await fetch(`${API_BASE_URL}/api/leituras/resumo`);

  if (!resposta.ok) {
    throw new Error("Erro ao buscar resumo");
  }

  return resposta.json();
}

async function buscarLeituras() {
  const resposta = await fetch(`${API_BASE_URL}/api/leituras`);

  if (!resposta.ok) {
    throw new Error("Erro ao buscar leituras");
  }

  return resposta.json();
}

function filtrarLeituras(leituras, filtro) {
  if (!Array.isArray(leituras)) {
    return [];
  }

  if (filtro === "ao-vivo") {
    return leituras.slice(0, 20);
  }

  const agora = new Date();

  return leituras.filter((leitura) => {
    const data = obterDataLeitura(leitura);

    if (!data) {
      return false;
    }

    const diferencaMs = agora.getTime() - data.getTime();
    const diferencaDias = diferencaMs / (1000 * 60 * 60 * 24);

    if (filtro === "dia") {
      return diferencaDias <= 1;
    }

    if (filtro === "semana") {
      return diferencaDias <= 7;
    }

    if (filtro === "mes") {
      return diferencaDias <= 30;
    }

    return true;
  });
}

function obterTextoFiltro(filtro) {
  const textos = {
    "ao-vivo": "Exibindo as últimas leituras recebidas em tempo real.",
    "dia": "Exibindo leituras registradas nas últimas 24 horas.",
    "semana": "Exibindo leituras registradas nos últimos 7 dias.",
    "mes": "Exibindo leituras registradas nos últimos 30 dias."
  };

  return textos[filtro] || textos["ao-vivo"];
}

function calcularResumoPeriodo(leiturasFiltradas) {
  const totalLeituras = leiturasFiltradas.length;

  const potenciaTotal = leiturasFiltradas.reduce((total, leitura) => {
    return total + Number(leitura.potencia || 0);
  }, 0);

  const consumoTotal = leiturasFiltradas.reduce((total, leitura) => {
    return total + Number(leitura.consumo_kwh || leitura.consumo || 0);
  }, 0);

  const potenciaMedia = totalLeituras > 0 ? potenciaTotal / totalLeituras : 0;
  const custoTotal = consumoTotal * configuracoes.tarifaKwh;

  return {
    totalLeituras,
    potenciaMedia,
    consumoTotal,
    custoTotal
  };
}

function atualizarCards(leiturasFiltradas) {
  const ultimaLeitura = leiturasGlobais.length > 0 ? leiturasGlobais[0] : null;
  const resumoPeriodo = calcularResumoPeriodo(leiturasFiltradas);

  if (ultimaLeitura) {
    correnteAtualEl.textContent = `${formatarNumero(ultimaLeitura.corrente, 3)} A`;
    potenciaAtualEl.textContent = `${formatarNumero(ultimaLeitura.potencia, 2)} W`;
  } else {
    correnteAtualEl.textContent = "0,000 A";
    potenciaAtualEl.textContent = "0,00 W";
  }

  consumoTotalEl.textContent = `${formatarNumero(resumoPeriodo.consumoTotal, 6)} kWh`;
  valorEstimadoEl.textContent = formatarMoeda(resumoPeriodo.custoTotal);
}

function atualizarResumoFiltro(leiturasFiltradas) {
  const resumoPeriodo = calcularResumoPeriodo(leiturasFiltradas);

  leiturasPeriodoEl.textContent = resumoPeriodo.totalLeituras;
  potenciaMediaPeriodoEl.textContent = `${formatarNumero(resumoPeriodo.potenciaMedia, 2)} W`;
  consumoPeriodoEl.textContent = `${formatarNumero(resumoPeriodo.consumoTotal, 6)} kWh`;
  custoPeriodoEl.textContent = formatarMoeda(resumoPeriodo.custoTotal);

  descricaoFiltroGraficoEl.textContent = obterTextoFiltro(filtroAtual);
}

function atualizarTabela(leituras) {
  if (!leituras || leituras.length === 0) {
    tabelaLeiturasEl.innerHTML = `
      <tr>
        <td colspan="5">Nenhuma leitura registrada para este filtro.</td>
      </tr>
    `;
    return;
  }

  tabelaLeiturasEl.innerHTML = leituras.map((leitura) => {
    const consumo = Number(leitura.consumo_kwh || leitura.consumo || 0);
    const data = leitura.criado_em || leitura.data_hora;

    return `
      <tr>
        <td>${leitura.id}</td>
        <td>${formatarNumero(leitura.corrente, 3)} A</td>
        <td>${formatarNumero(leitura.potencia, 2)} W</td>
        <td>${formatarNumero(consumo, 8)} kWh</td>
        <td>${formatarData(data)}</td>
      </tr>
    `;
  }).join("");
}

function atualizarGrafico(leiturasFiltradas) {
  if (!graficoCanvas || typeof Chart === "undefined") {
    return;
  }

  const leiturasOrdenadas = [...leiturasFiltradas].reverse();

  const labels = leiturasOrdenadas.map((leitura) => {
    return formatarData(leitura.criado_em || leitura.data_hora);
  });

  const dadosPotencia = leiturasOrdenadas.map((leitura) => {
    return Number(leitura.potencia || 0);
  });

  if (graficoPotencia) {
    graficoPotencia.data.labels = labels;
    graficoPotencia.data.datasets[0].data = dadosPotencia;
    graficoPotencia.update();
    return;
  }

  graficoPotencia = new Chart(graficoCanvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Potência W",
          data: dadosPotencia,
          borderWidth: 3,
          tension: 0.35,
          pointRadius: 3,
          pointHoverRadius: 6,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false
      },
      plugins: {
        legend: {
          display: true,
          labels: {
            usePointStyle: true,
            boxWidth: 8,
            font: {
              weight: "bold"
            }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `Potência: ${formatarNumero(context.raw, 2)} W`;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            maxTicksLimit: 6
          },
          grid: {
            display: false
          }
        },
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return `${value} W`;
            }
          }
        }
      }
    }
  });
}

function renderizarDashboard() {
  const leiturasFiltradas = filtrarLeituras(leiturasGlobais, filtroAtual);

  atualizarCards(leiturasFiltradas);
  atualizarResumoFiltro(leiturasFiltradas);
  atualizarTabela(leiturasFiltradas);
  atualizarGrafico(leiturasFiltradas);
}

async function carregarDashboard() {
  try {
    await buscarResumo();
    leiturasGlobais = await buscarLeituras();

    atualizarStatusApi(true);
    renderizarDashboard();
  } catch (erro) {
    console.error("Erro ao carregar dashboard:", erro);
    atualizarStatusApi(false);
  }
}

function carregarConfiguracoesNaTela() {
  inputNomeUsuarioEl.value = configuracoes.nomeUsuario;
  inputTarifaKwhEl.value = configuracoes.tarifaKwh;

  nomeUsuarioTopoEl.textContent = configuracoes.nomeUsuario;
  previewNomeUsuarioEl.textContent = configuracoes.nomeUsuario;

  const tarifaFormatada = `${formatarMoeda(configuracoes.tarifaKwh)}/kWh`;

  tarifaAtualTopoEl.textContent = tarifaFormatada;
  previewTarifaKwhEl.textContent = tarifaFormatada;
}

function salvarConfiguracoes(event) {
  event.preventDefault();

  const nome = inputNomeUsuarioEl.value.trim() || "Usuário";
  const tarifa = Number(inputTarifaKwhEl.value) || 0.85;

  configuracoes.nomeUsuario = nome;
  configuracoes.tarifaKwh = tarifa;

  localStorage.setItem("wattwise_nome_usuario", nome);
  localStorage.setItem("wattwise_tarifa_kwh", String(tarifa));

  carregarConfiguracoesNaTela();
  renderizarDashboard();

  alert("Configurações salvas com sucesso!");
}

function configurarFiltros() {
  filtroBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      filtroBtns.forEach((item) => item.classList.remove("active"));
      btn.classList.add("active");

      filtroAtual = btn.dataset.filtro;
      renderizarDashboard();
    });
  });
}

function configurarTabs() {
  const menuItems = document.querySelectorAll(".nav-menu .nav-item");
  const tabContents = document.querySelectorAll(".tab-content");

  const informacoesHeader = {
    "visao-geral": {
      titulo: "Painel Principal",
      subtitulo: "Monitoramento em tempo real do consumo elétrico"
    },
    "poupanca": {
      titulo: "Eficiência Energética",
      subtitulo: "Dicas para reduzir desperdício e melhorar o consumo"
    },
    "configuracoes": {
      titulo: "Personalização",
      subtitulo: "Ajuste o usuário e a tarifa usada nos cálculos"
    }
  };

  menuItems.forEach((item) => {
    item.addEventListener("click", () => {
      const tabId = item.getAttribute("data-tab");

      menuItems.forEach((i) => i.classList.remove("active"));
      item.classList.add("active");

      tabContents.forEach((content) => {
        content.classList.remove("active");

        if (content.id === `content-${tabId}`) {
          content.classList.add("active");
        }
      });

      if (informacoesHeader[tabId]) {
        tituloPaginaEl.textContent = informacoesHeader[tabId].titulo;
        subtituloPaginaEl.textContent = informacoesHeader[tabId].subtitulo;
      }

      if (tabId === "visao-geral" && graficoPotencia) {
        setTimeout(() => {
          graficoPotencia.resize();
        }, 100);
      }
    });
  });
}

function iniciarAplicacao() {
  carregarConfiguracoesNaTela();
  configurarFiltros();
  configurarTabs();

  if (formConfiguracoesEl) {
    formConfiguracoesEl.addEventListener("submit", salvarConfiguracoes);
  }

  carregarDashboard();
  setInterval(carregarDashboard, 5000);
}

document.addEventListener("DOMContentLoaded", iniciarAplicacao);