const API_BASE_URL = "";

const correnteAtualEl = document.getElementById("correnteAtual");
const potenciaAtualEl = document.getElementById("potenciaAtual");
const consumoTotalEl = document.getElementById("consumoTotal");
const valorEstimadoEl = document.getElementById("valorEstimado");

const statusIndicadorEl = document.getElementById("statusIndicador");
const statusTextoEl = document.getElementById("statusTexto");

const tabelaLeiturasEl = document.getElementById("tabelaLeituras");

const graficoCanvas = document.getElementById("graficoPotencia");

let graficoPotencia = null;

function formatarNumero(valor, casas = 2) {
  const numero = Number(valor || 0);

  return numero.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas
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

function atualizarCards(resumo, leituras) {
  const ultimaLeitura = leituras.length > 0 ? leituras[0] : null;

  if (ultimaLeitura) {
    correnteAtualEl.textContent = `${formatarNumero(ultimaLeitura.corrente, 3)} A`;
    potenciaAtualEl.textContent = `${formatarNumero(ultimaLeitura.potencia, 2)} W`;
  } else {
    correnteAtualEl.textContent = "0,000 A";
    potenciaAtualEl.textContent = "0,00 W";
  }

  consumoTotalEl.textContent = `${formatarNumero(resumo.consumo_total_kwh, 6)} kWh`;
  valorEstimadoEl.textContent = `R$ ${formatarNumero(resumo.valor_total_estimado, 2)}`;
}

function atualizarTabela(leituras) {
  if (!leituras || leituras.length === 0) {
    tabelaLeiturasEl.innerHTML = `
      <tr>
        <td colspan="5">Nenhuma leitura registrada ainda.</td>
      </tr>
    `;
    return;
  }

  tabelaLeiturasEl.innerHTML = leituras.map((leitura) => {
    return `
      <tr>
        <td>${leitura.id}</td>
        <td>${formatarNumero(leitura.corrente, 3)} A</td>
        <td>${formatarNumero(leitura.potencia, 2)} W</td>
        <td>${formatarNumero(leitura.consumo_kwh, 8)} kWh</td>
        <td>${formatarData(leitura.criado_em)}</td>
      </tr>
    `;
  }).join("");
}

function atualizarGrafico(leituras) {
  if (!graficoCanvas) {
    return;
  }

  const leiturasOrdenadas = [...leituras].reverse();

  const labels = leiturasOrdenadas.map((leitura) => {
    return formatarData(leitura.criado_em);
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
      labels: labels,
      datasets: [
        {
          label: "Potência W",
          data: dadosPotencia,
          borderWidth: 2,
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: true
        },
        tooltip: {
          mode: "index",
          intersect: false
        }
      },
      scales: {
        x: {
          ticks: {
            maxTicksLimit: 6
          }
        },
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

async function carregarDashboard() {
  try {
    const [resumo, leituras] = await Promise.all([
      buscarResumo(),
      buscarLeituras()
    ]);

    atualizarStatusApi(true);
    atualizarCards(resumo, leituras);
    atualizarTabela(leituras);
    atualizarGrafico(leituras);
  } catch (erro) {
    console.error("Erro ao carregar dashboard:", erro);
    atualizarStatusApi(false);
  }
}

carregarDashboard();

setInterval(carregarDashboard, 5000);