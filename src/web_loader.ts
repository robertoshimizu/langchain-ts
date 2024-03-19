/* eslint-disable @typescript-eslint/no-unused-vars */
import { ChatOpenAI } from '@langchain/openai'
import dotenv from 'dotenv'
import {
  ChatPromptTemplate,
  MessagesPlaceholder
} from '@langchain/core/prompts'
import { AgentExecutor, type AgentStep } from 'langchain/agents'
import { DynamicTool } from '@langchain/core/tools'
import { convertToOpenAIFunction } from '@langchain/core/utils/function_calling'
import {
  RunnablePassthrough,
  RunnableSequence
} from '@langchain/core/runnables'
import { OpenAIFunctionsAgentOutputParser } from 'langchain/agents/openai/output_parser'
import { formatToOpenAIFunctionMessages } from 'langchain/agents/format_scratchpad'
import { webScraper } from './research_gpt/web_scraper'
import { StringOutputParser } from '@langchain/core/output_parsers'
import { PDFLoader } from 'langchain/document_loaders/fs/pdf'
import { Document } from 'langchain/document'
import * as fs from 'fs'
import { promises as fsPromises } from 'fs'
import { TextLoader } from 'langchain/document_loaders/fs/text'
dotenv.config()

// Regex para identificar o início de cada procedimento
const procedureRegex = /\n\d+\.\s[^;]+/g

// Regex para identificar subitens dentro de cada procedimento
const subitemRegex = /(?:\n\d+|\n[a-z])\.\s[^;]+/g

// Função para extrair procedimentos e seus subitens
function extractProcedures(text: string) {
  const procedures = []
  let match

  while ((match = procedureRegex.exec(text)) !== null) {
    // Inclui o título do procedimento
    const procedure = { title: match[0].trim(), subitems: [] as string[] }

    // Limita a busca de subitens ao próximo procedimento
    const startIndex = match.index
    const nextProcedureMatch = procedureRegex.exec(text)
    const endIndex = nextProcedureMatch ? nextProcedureMatch.index : text.length
    const procedureText = text.slice(startIndex, endIndex)

    // Extrai os subitens
    let subitemMatch
    while ((subitemMatch = subitemRegex.exec(procedureText)) !== null) {
      procedure.subitems.push(subitemMatch[0].trim())
    }

    procedures.push(procedure)
  }

  return procedures
}

async function maine() {
  const scrapeData = await webScraper(
    '',
    'https://www.in.gov.br/en/web/dou/-/resolucao-normativa-rn-n-465-de-24-de-fevereiro-de-2021-306209339'
  )
  //console.log(scrapeData)

  // const loader = new PDFLoader(
  //   'src/documents/Anexo_II_DUT_2021_RN_465.2021_tea.br_RN473_RN477_RN478_RN480_RN513_RN536.pdf',
  //   {
  //     splitPages: false
  //   }
  // )

  // const docs = await loader.load()

  // const text = docs[0].pageContent

  //const outputPath = 'output.txt'

  // Write the text to a file
  //fs.writeFileSync(outputPath, text)

  // const procedures = extractProcedures(scrapeData)
  // console.log(procedures)

  // const prompt = ChatPromptTemplate.fromMessages([
  //   [
  //     'system',
  //     `You are a world class lawyer assistant of ANS, more specifically of the Anex II of the Resolution 465/2021. When people ask for a specific DUT
  //     number, you should be able to answer them by looking at the item of the anexoII. DUT stands for "Diretriz de Utilização"
  //     For example if question is : "o que diz a DUT n 71 do anexo 2 da RN 465/2021 da ANS?"
  //     you should be able to answer by looking at the document Anexo II and finding the item 71, which is
  //     "71. TRANSPLANTE AUTÓLOGO DE MEDULA ÓSSEA" and then retrieve the content of this item, which is
  //     "
  //     1. Cobertura obrigatória para receptores com idade igual ou inferior a 75 anos, portadores de uma das seguintes patologias:
  //       a. leucemia mielóide aguda em primeira ou segunda remissão;
  //       b. linfoma não Hodgkin de graus intermediário e alto, indolente transformado, quimiossensível, como terapia de salvamento após a primeira recidiva;
  //       c. doença de Hodgkin quimiossensível, como terapia de salvamento, excluídos os doentes que não se beneficiaram de um esquema quimioterápico atual;
  //       d. mieloma múltiplo;
  //       e. tumor de célula germinativa recidivado, quimiossensível, excluídos os doentes que não se beneficiaram de um esquema quimioterápico atual;
  //       f. neuroblastoma em estádio IV e/ou alto risco (estádio II, III e IVS com nMyc amplificado e idade igual ou maior do que 6 meses, desde que bom respondedor à quimioterapia definida como remissão completa ou resposta parcial), em primeira terapia.
  //     " to answer the question.`
  //   ],
  //   [
  //     'user',
  //     'Answer this query: {input} using this document - Anexo II: {document}'
  //   ]
  // ])
  // const outputParser = new StringOutputParser()
  // const chatModel = new ChatOpenAI({
  //   modelName: 'gpt-4-turbo-preview',
  //   temperature: 0,
  //   streaming: false
  // })
  // const llmChain = prompt.pipe(chatModel).pipe(outputParser)

  // const answer = await llmChain.invoke({
  //   input: `

  //   Extraia a metadata das 3 primeiras diretrizes da resolucao, seguindo o modelo e exemplos abaixo:

  //   -Nome do Procedimento: Identificação clara do procedimento.
  //   -Método/Equipamento: Como o procedimento é realizado e/ou quais equipamentos são necessários.
  //   -Condição Alvo: Para quais doenças ou condições o procedimento é indicado.
  //   -Critérios de Cobertura: Condições sob as quais o procedimento é coberto pelos planos de saúde.
  //   -Referências Bibliográficas: Onde mais informações sobre o procedimento e sua aplicação podem ser encontradas.

  //   Exemplos:
  //   1.  Ablação por Radiofrequência/Crioablação do Câncer Primário Hepático
  //       Procedimento: Ablação por Radiofrequência/Crioablação do Câncer Primário Hepático
  //       Métodos: Laparotomia, Videolaparoscopia, Percutânea guiada por Ultrassonografia e/ou Tomografia Computadorizada
  //       Condição Alvo: Carcinoma hepático primário
  //       Cobertura: Obrigatória para pacientes Child A ou B, doença restrita ao fígado, lesões menores que 4cm
  //   2.  Acilcarnitinas, Perfil Qualitativo e/ou Quantitativo com Espectrometria de Massa em Tandem
  //       Procedimento: Acilcarnitinas, Perfil Qualitativo e/ou Quantitativo
  //       Método de Análise: Espectrometria de Massa em Tandem
  //       Condições Alvo: Hipoglicemia hipocetótica, deterioração neurológica, síndrome de Reye, cardiomiopatia dilatada ou hipertrófica, miopatia esquelética, doenças neuromusculares
  //       Cobertura: Obrigatória sob certas condições clínicas e familiares
  //   3.  Angiotomografia Coronariana
  //       Procedimento: Angiotomografia Coronariana
  //       Equipamento Necessário: Aparelhos multislice com 64 colunas de detectores ou mais
  //       Condições Alvo: Avaliação de doença arterial coronariana, dor torácica aguda, insuficiência cardíaca, suspeita de coronárias anômalas
  //       Cobertura: Obrigatória segundo critérios específicos de probabilidade pré-teste e condições clínicas`,
  //   document: scrapeData
  // })

  // console.log(answer)

  //   const text = `
  // 1. ABLAÇÃO    POR RADIOFREQUÊNCIA/CRIOABLAÇÃO    DO    CÂNCER    PRIMÁRIO
  // HEPÁTICO POR LAPAROTOMIA; ABLAÇÃO POR RADIOFREQUÊNCIA/CRIOABLAÇÃO
  // DO   CÂNCER   PRIMÁRIO   HEPÁTICO   POR   VIDEOLAPAROSCOPIA; ABLAÇÃO   POR
  // RADIOFREQUÊNCIA/CRIOABLAÇÃO PERCUTÂNEA DO CÂNCER PRIMÁRIO HEPÁTICO
  // GUIADA POR ULTRASSONOGRAFIA E/OU TOMOGRAFIA COMPUTADORIZADA
  // 1. Cobertura obrigatória para pacientes Child A ou B com carcinoma hepático primário
  // quando a doença for restrita ao fígado e as lesões forem menores que 4cm.
  // 2. ACILCARNITINAS, PERFIL QUALITATIVO E/OU QUANTITATIVO COM
  // ESPECTROMETRIA DE MASSA EM TANDEM
  // 1. Cobertura obrigatória quando preenchido pelo menos um dos seguintes critérios:
  // a.  crianças  de  qualquer  idade  que  apresentem  um  episódio  ou  episódios
  // recorrentes  de  hipoglicemia  hipocetótica  ou  deterioração  neurológica  rápida
  // (letargia,  ataxia,  convulsões  ou  coma),  precipitada  por  jejum  prolongado,  ou
  // baixa   ingesta,   como   por   exemplo,   por   vômitos,   ou   por   aumento   das
  // necessidades energéticas (exercício prolongado, febre, infecções);
  // b. crianças de qualquer idade com síndrome de Reye ou “Reye-like” (encefalopatia
  // aguda não inflamatória com hiperamonemia e disfunção hepática);
  // c. pacientes de qualquer idade com cardiomiopatia dilatada ou hipertrófica sem
  // diagnóstico etiológico;
  // d. pacientes de qualquer idade com miopatia esquelética (fraqueza e dor muscular,
  // episódios de rabdomiólise) ou doenças neuromusculares.
  //  2. Cobertura obrigatória para pacientes assintomáticos, de qualquer idade, quando
  // preenchido pelo menos um dos seguintes critérios abaixo:
  //  a. História de irmã(o) afetado por defeito de beta-oxidação dos ácidos graxos ou
  // acilcarnitinas;
  //  b. História de irmã(o) com morte súbita de etiologia não definida;

  //  9
  //  c. História  de  mãe  ter  apresentado,  durante  a  gestação do  paciente,  síndrome
  // HELLP (hemólise,  enzimas  hepáticas  aumentadas  e  baixa  contagem  de
  // plaquetas) ou Fígado Gorduroso Agudo da Gravidez.
  //   Método de análise espectrometria de massas em tandem qualitativo e quantitativo.
  // Referência  Bibliográfica:  Tandem  Mass  Spectrometry  in  Clinical Diagnosis  in  Nenad
  // Blau; et al. Physician’s guide to the laboratory diagnosis of metabolic diseases. Berlin:
  // Springer, 2003, 2nd Ed. ISBN 3-540-42542-X

  // 3. ANGIOTOMOGRAFIA CORONARIANA
  // 1. Cobertura obrigatória quando preenchido pelo menos um dos seguintes critérios
  // (realização apenas em aparelhos multislice com 64 colunas de detectores ou mais):
  // a. avaliação inicial de pacientes sintomáticos com probabilidade pré-teste de 10 a
  // 70% calculada segundo os critérios de Diamond Forrester revisado1, como uma
  // opção  aos  outros  métodos  diagnósticos  de  doença  arterial  coronariana,
  // conforme tabela a seguir:
  // Probabilidade pré-teste em pacientes com dor torácica (%)
  // Idade
  // Angina Típica Angina Atípica Dor não anginosa
  // Homem Mulher Homem Mulher Homem Mulher
  // 30-39 59,1 22,5 28,9 9,6 17,7 5,3
  // 40-49 68,9 36,7 38,4 14 24,8 8
  // 50-59 77,3 47,1 48,9 20 33,6 11,7
  // 60-69 83,9 57,7 59,4 27,7 43,7 16,9
  // 70-79 88,9 67,7 69,2 37 54,4 23,8
  // >80 92,5 76,3 77,5 47,4 64,6 32,3
  // (adaptado de T.S.S. Genders ET AL, 2011)

  // b.  dor  torácica  aguda,  em  pacientes  com  TIMI  RISK  1  e  2,  com  sintomas
  // compatíveis com síndrome coronariana aguda ou equivalente anginoso e sem
  // alterações isquêmicas ao ECG e marcadores de necrose miocárdica;
  // c.  para  descartar  doença  coronariana  isquêmica,  em pacientes  com  diagnóstico
  // estabelecido  de  insuficiência  cardíaca  (IC)  recente,  onde  permaneça  dúvida

  //  10
  // sobre   a   etiologia   da   IC   mesmo   após   a   realização   de   outros   exames
  // complementares;
  // d.  em  pacientes  com  quadro  clínico  e  exames  complementares  conflitantes,
  // quando  permanece  dúvida  diagnóstica  mesmo  após  a  realização  de  exames
  // funcionais para avaliação de isquemia;
  // e. pacientes com suspeita de coronárias anômalas.
  //  Referências Bibliográficas:
  // 1. Genders TS, Steyerberg EW, Alkadhi H, Leschka S, Desbiolles L, Nieman K, Galema
  // TW,  Meijboom WB,  Mollet  NR,  de  Feyter  PJ,  Cademartiri  F,  Maffei  E,  Dewey  M,
  // Zimmermann  E,  Laule  M,  Pugliese  F,  Barbagallo  R,  Sinitsyn  V,  Bogaert  J,
  // Goetschalckx K, Schoepf UJ, Rowe GW, Schuijf JD, Bax JJ, de Graaf FR, Knuuti J,
  // Kajander  S,  van  Mieghem  CA,  Meijs  MF,  Cramer  MJ,  Gopalan  D,  Feuchtner  G,
  // Friedrich G, Krestin GP, Hunink MG. A clinical prediction rule for the diagnosis of
  // coronary artery disease: validation, updating, and extension. Eur Heart J. 2011
  // 2. Jensen JM, Voss M, Hansen VB, Andersen LK, Johansen PB, Munkholm H, Nørgaard
  // BL. Risk stratification of patients suspected of coronary artery disease: comparison
  // of five different models. Atherosclerosis. 2012 Feb;220(2):557-62.
  // 3. Mark DB, Berman DS, Budoff MJ, et al. ACCF/ACR/AHA/NASCI/SAIP/SCAI/SCCT
  // 2010   expert   consensus   document   on   coronary   computed   tomographic
  // angiography: a report of the American College of Cardiology Foundation Task Force
  // on Expert Consensus Documents. Circulation 2010;121:2509-43.
  // 4. Taylor AJ, Cerqueira M, Hodgson JM, et al.
  // ACCF/SCCT/ACR/AHA/ASE/ASNC/NASCI/SCAI/SCMR    2010    Appropriate    Use
  // Criteria for Cardiac Computed Tomography. A Report of the American College of
  // Cardiology  Foundation  Appropriate  Use  Criteria  Task  Force,  the  Society  of
  // Cardiovascular  Computed  Tomography,  the  American  College  of  Radiology,  the
  // American  Heart  Association,  the  American  Society  of  Echocardiography,  the
  // American   Society   of   Nuclear   Cardiology,   the   North   American   Society   for
  // Cardiovascular   Imaging,   the   Society   for   Cardiovascular   Angiography   and
  // Interventions, and the Society for Cardiovascular Magnetic Resonance. Circulation
  // 2010;122:e525-55.
  // 5. Min JK, Shaw LJ, Berman DS. The present state of coronary computed tomography
  // angiography a process in evolution. J Am Coll Cardiol;55:957-65.

  //  11
  // 6. [Guideline of Sociedade Brasileira de Cardiologia for Resonance and cardiovascular
  // tomography. Executive Summary]. Arq Bras Cardiol 2006;87 Suppl 3:e1-12.
  // 7. Dennie CJ, Leipsic J, Brydie A. Canadian Association of Radiologists:  Consensus
  // Guidelines and Standards for Cardiac CT. Can Assoc Radiol J 2009;60:19-34.
  // 8. Diamond  GA,  Kaul  S.  Bayesian  classification  of  clinical  practice  guidelines. Arch
  // Intern Med 2009;169:1431-5.
  // 9. Pryor DB, Shaw L, McCants CB, et al. Value of the history and physical in identifying
  // patients   at   increased   risk   for   coronary   artery   disease. Ann   Intern   Med
  // 1993;118:81-90.
  // 10. Diamond  GA,  Forrester  JS.  Analysis  of  probability  as  an  aid  in  the  clinical
  // diagnosis of coronary-artery disease. N Engl J Med 1979;300:1350-8.
  // 11. Gibbons  RJ,  Balady  GJ,  Bricker  JT,  et  al.  ACC/AHA  2002  guideline  update  for
  // exercise   testing:   summary   article:   a   report   of   the   American   College   of
  // Cardiology/American   Heart   Association   Task   Force   on   Practice   Guidelines
  // (Committee   to   Update   the   1997   Exercise   Testing   Guidelines). Circulation
  // 2002;106:1883-92.
  // 12. Gibbons RJ, Abrams J, Chatterjee K, et al. ACC/AHA 2002 guideline update for
  // the management of patients with chronic stable angina--summary article: a report
  // of the American College of Cardiology/American Heart Association Task Force on
  // Practice  Guidelines  (Committee  on  the  Management  of  Patients  With  Chronic
  // Stable Angina). Circulation 2003;107:149-58.
  // 4. ANTICORPOS ANTI PEPTÍDEO CÍCLICO CITRULINADO - IGG (ANTI CCP)
  // 1. Cobertura obrigatória na investigação diagnóstica de Artrite Reumatóide, quando
  // o fator reumatóide for negativo.
  // 5. AUDIOMETRIA    VOCAL    COM    MENSAGEM    COMPETITIVA/    AVALIAÇÃO    DO
  // PROCESSAMENTO AUDITIVO CENTRAL
  // 1.  Cobertura  obrigatória  para  pacientes  a  partir  de  3  anos  de  idade,  conforme
  // indicação do médico assistente, quando preenchido pelo menos um dos critérios do
  // Grupo I e nenhum dos critérios do Grupo II:
  // Grupo I
  // a. dificuldades de aprendizagem;

  //  12
  // b. dificuldade de compreensão em ambientes ruidosos;
  // c. dificuldade de comunicação oral e/ou escrita;
  // d. agitados, hiperativos ou muito quietos;
  // e. alteração de comportamento e/ou de atenção;
  // f. dificuldades auditivas não orgânicas (resultado de audiometria tonal normal).
  // Grupo II
  // a. pacientes com habilidades de linguagem receptiva e emissiva insuficientes para
  // compreender  as  tarefas  verbais  solicitadas  ou  que  apresentem  problemas
  // cognitivBos;
  // b. ausência de avaliação audiológica básica prévia.
  //  Referências Bibliográficas:
  // 1. Momensohn-Santos,  T.  M.;  Branco-Barreiro,  F.  C.  A. - Avaliação  e  Intervenção
  // Fonoaudiológica no Transtorno de Processamento Auditivo Central – In: Ferreira,
  // L. P. (Org.) – Tratado de Fonoaudiologia – São Paulo: Roca, 2004.
  // 2. Pereira, L. D. – Avaliação do Processamento Auditivo Central. In: Filho, O. L. (Org.)
  // – Tratado de Fonoaudiologia – 2
  // a
  // . edição, Ribeirão Preto, SP: Tecmedd, 2005.
  // 6. AVIDEZ DE IGG PARA TOXOPLASMOSE
  // 1.   Cobertura   obrigatória   para   gestantes   com   sorologia   IgM   positiva   para
  // toxoplasmose, quando preenchido pelo menos um dos seguintes critérios:
  // a. quando o resultado do IgM for maior que 2;
  // b. quando o resultado do IgM estiver entre 1 e 2 na primeira testagem e aumentar
  // na segunda testagem, realizada após intervalo de 3 a 4 semanas.  `
  const filePath = 'mytext.txt'
  // Read the content of the file
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading file:', err)
      return
    }

    // Assuming we are now processing the data and not just logging it
    // You can now split the data or process as required

    // For example, split the content by the asterisk delimiter
    const sections = data
      .split('************************************')
      .filter((section) => section.trim() !== '')

    // Here you would write each section to a file or process it further
    // This is just an example to print out the number of sections
    console.log(`The file has been split into ${sections.length} sections.`)

    // If you need to check the content of a section without printing to console,
    // you could write the content to a new text file to inspect it
    sections.forEach((section, index) => {
      const outputFilePath = `section_${index + 1}.txt`
      fs.writeFile(outputFilePath, section, 'utf8', (writeErr) => {
        if (writeErr) {
          console.error(`Error writing section ${index + 1} to file:`, writeErr)
        } else {
          console.log(`Section ${index + 1} written to ${outputFilePath}`)
        }
      })
    })
  })

  // const sections = inputText
  //   .split('************************************')
  //   .filter(Boolean)

  // sections.forEach((section, index) => {
  //   console.log(`Section ${index + 1} :`, section)
  // })

  // const extractUppercaseBlocks = (inputText: string) => {
  //   const uppercaseBlockRegex =
  //     /^(\d+\.\s+([A-ZÁÉÍÓÚÂÊÎÔÛÃÕÀÇ\s]+(?:\s+[^a-z]*\s*)*))$/gm
  //   let blocks = []
  //   let match

  //   while ((match = uppercaseBlockRegex.exec(inputText)) !== null) {
  //     blocks.push(match[1].trim())
  //   }

  //   return blocks
  // }

  // const uppercaseBlocks = extractUppercaseBlocks(text)
  // console.log(uppercaseBlocks.length)

  // console.log(`Total uppercase blocks found: ${uppercaseBlocks.length}`)
  // uppercaseBlocks.forEach((block, index) => {
  //   console.log(`Block ${index + 1}:`)
  //   console.log(block.replace(/^\s*\d+\s*$/gm, ''))
  //   console.log('************************************\n')
  // })

  // const extractContentBetweenBlocks = (inputText: string) => {
  //   const blocks = []
  //   const blockRegex =
  //     /^(\d+\.\s+([A-ZÁÉÍÓÚÂÊÎÔÛÃÕÀÇ\s]+(?:\s+[^a-z]*\s*)*))$/gm

  //   let lastIndex = 0
  //   let match
  //   while ((match = blockRegex.exec(inputText)) !== null) {
  //     if (lastIndex < match.index) {
  //       const content = inputText.substring(lastIndex, match.index).trim()
  //       if (content) {
  //         blocks.push(content)
  //       }
  //     }
  //     lastIndex = blockRegex.lastIndex
  //   }

  //   // Capture any remaining text after the last uppercase block
  //   if (lastIndex < inputText.length) {
  //     const content = inputText.substring(lastIndex).trim()
  //     if (content) {
  //       blocks.push(content)
  //     }
  //   }

  //   return blocks
  // }

  // const contentBlocks = extractContentBetweenBlocks(text)
  // console.log(contentBlocks.length)

  // console.log(`Total content blocks found: ${contentBlocks.length}`)
  // contentBlocks.forEach((block, index) => {
  //   console.log(`Content Block ${index + 1}:`)
  //   console.log(block.replace(/^\s*\d+\s*$/gm, ''))
  //   console.log('************************************\n')
  // })
}

async function readFileAsync(path: string) {
  try {
    const data = await fsPromises.readFile(path, 'utf8')
    console.log('File content read successfully.')
    return data.replace(/\r/g, '')
  } catch (err) {
    console.error('Error reading file:', err)
  }
}

async function textLoader(filePath: string) {
  const loader = new TextLoader(filePath)
  const docs = await loader.load()

  return docs
}
async function main() {
  const filePath = 'section_6.txt'
  const data = await readFileAsync(filePath)
  if (data) {
    console.log(data.length)
    console.dir(data, { maxArrayLength: null })
    const prompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        `Você deve analisar diretrizes de procedimentos médicos fornecidas no documento. 
         Para cada procedimento analize e extraia os seguintes metadados essenciais:

          Nome do Procedimento: A descrição completa do procedimento.
          Indicações de Cobertura: sintomas ou condicao clinica do paciente específicos que justificam a cobertura do procedimento.
          Tecnologia ou Método Utilizado: Os métodos ou tecnologias específicos aplicados no procedimento.
          Apresente os metadados extraídos em formato JSON, seguindo este modelo para cada procedimento: 
         
              Numero do Procedimento,
              Nome do Procedimento, 
              Indicações de Cobertura ,
              Tecnologia ou Método Utilizado,
          
          Assegure-se de que a descrição seja concisa e precisa, capturando apenas as informações essenciais. 
          Ignore detalhes que não se encaixem nos três metadados solicitados.
          Exemplo:
          Procedimento:
          "3. ANGIOTOMOGRAFIA CORONARIANA 1. Cobertura obrigatória quando preenchido pelo menos um dos seguintes critérios (realização apenas em aparelhos multislice com 64 colunas de detectores ou mais): a. avaliação inicial de pacientes sintomáticos com probabilidade pré-teste de 10 a 70% calculada segundo os critérios de Diamond Forrester revisado1, como uma opção  aos  outros  métodos  diagnósticos  de  doença  arterial  coronariana, conforme tabela a seguir: Probabilidade pré-teste em pacientes com dor torácica (%) Idade Angina Típica Angina Atípica Dor não anginosa Homem Mulher Homem Mulher Homem Mulher 30-39 59,1 22,5 28,9 9,6 17,7 5,3 40-49 68,9 36,7 38,4 14 24,8 8 50-59 77,3 47,1 48,9 20 33,6 11,7 60-69 83,9 57,7 59,4 27,7 43,7 16,9 70-79 88,9 67,7 69,2 37 54,4 23,8 >80 92,5 76,3 77,5 47,4 64,6 32,3 (adaptado de T.S.S. Genders ET AL, 2011)  b.  dor  torácica  aguda,  em  pacientes  com  TIMI  RISK  1  e  2,  com  sintomas compatíveis com síndrome coronariana aguda ou equivalente anginoso e sem alterações isquêmicas ao ECG e marcadores de necrose miocárdica;  c.  para  descartar  doença  coronariana  isquêmica,  em pacientes  com  diagnóstico estabelecido  de  insuficiência  cardíaca  (IC)  recente,  onde  permaneça  dúvida sobre   a   etiologia   da   IC   mesmo   após   a   realização   de   outros   exames complementares;  d.  em  pacientes  com  quadro  clínico  e  exames  complementares  conflitantes, quando  permanece  dúvida  diagnóstica  mesmo  após  a  realização  de  exames funcionais para avaliação de isquemia; e. pacientes com suspeita de coronárias anômalas.   Referências Bibliográficas: 1. Genders TS, Steyerberg EW, Alkadhi H, Leschka S, Desbiolles L, Nieman K, Galema TW,  Meijboom WB,  Mollet  NR,  de  Feyter  PJ,  Cademartiri  F,  Maffei  E,  Dewey  M, Zimmermann  E,  Laule  M,  Pugliese  F,  Barbagallo  R,  Sinitsyn  V,  Bogaert  J, Goetschalckx K, Schoepf UJ, Rowe GW, Schuijf JD, Bax JJ, de Graaf FR, Knuuti J, Kajander  S,  van  Mieghem  CA,  Meijs  MF,  Cramer  MJ,  Gopalan  D,  Feuchtner  G, Friedrich G, Krestin GP, Hunink MG. A clinical prediction rule for the diagnosis of coronary artery disease: validation, updating, and extension. Eur Heart J. 2011 2. Jensen JM, Voss M, Hansen VB, Andersen LK, Johansen PB, Munkholm H, Nørgaard BL. Risk stratification of patients suspected of coronary artery disease: comparison of five different models. Atherosclerosis. 2012 Feb;220(2):557-62.  3. Mark DB, Berman DS, Budoff MJ, et al. ACCF/ACR/AHA/NASCI/SAIP/SCAI/SCCT 2010   expert   consensus   document   on   coronary   computed   tomographic angiography: a report of the American College of Cardiology Foundation Task Force on Expert Consensus Documents. Circulation 2010;121:2509-43. 4. Taylor AJ, Cerqueira M, Hodgson JM, et al. ACCF/SCCT/ACR/AHA/ASE/ASNC/NASCI/SCAI/SCMR    2010    Appropriate    Use Criteria for Cardiac Computed Tomography. A Report of the American College of Cardiology  Foundation  Appropriate  Use  Criteria  Task  Force,  the  Society  of Cardiovascular  Computed  Tomography,  the  American  College  of  Radiology,  the American  Heart  Association,  the  American  Society  of  Echocardiography,  the American   Society   of   Nuclear   Cardiology,   the   North   American   Society   for Cardiovascular   Imaging,   the   Society   for   Cardiovascular   Angiography   and Interventions, and the Society for Cardiovascular Magnetic Resonance. Circulation 2010;122:e525-55. 5. Min JK, Shaw LJ, Berman DS. The present state of coronary computed tomography angiography a process in evolution. J Am Coll Cardiol;55:957-65. 6. [Guideline of Sociedade Brasileira de Cardiologia for Resonance and cardiovascular tomography. Executive Summary]. Arq Bras Cardiol 2006;87 Suppl 3:e1-12. 7. Dennie CJ, Leipsic J, Brydie A. Canadian Association of Radiologists:  Consensus Guidelines and Standards for Cardiac CT. Can Assoc Radiol J 2009;60:19-34. 8. Diamond  GA,  Kaul  S.  Bayesian  classification  of  clinical  practice  guidelines. Arch Intern Med 2009;169:1431-5. 9. Pryor DB, Shaw L, McCants CB, et al. Value of the history and physical in identifying patients   at   increased   risk   for   coronary   artery   disease. Ann   Intern   Med 1993;118:81-90. 10. Diamond  GA,  Forrester  JS.  Analysis  of  probability  as  an  aid  in  the  clinical diagnosis of coronary-artery disease. N Engl J Med 1979;300:1350-8. 11. Gibbons  RJ,  Balady  GJ,  Bricker  JT,  et  al.  ACC/AHA  2002  guideline  update  for exercise   testing:   summary   article:   a   report   of   the   American   College   of Cardiology/American   Heart   Association   Task   Force   on   Practice   Guidelines (Committee   to   Update   the   1997   Exercise   Testing   Guidelines). Circulation 2002;106:1883-92. 12. Gibbons RJ, Abrams J, Chatterjee K, et al. ACC/AHA 2002 guideline update for the management of patients with chronic stable angina--summary article: a report of the American College of Cardiology/American Heart Association Task Force on Practice  Guidelines  (Committee  on  the  Management  of  Patients  With  Chronic Stable Angina). Circulation 2003;107:149-58. "
          Nome do Procedimento

            Procedimento: Ablação por Radiofrequência/Crioablação do Câncer Primário Hepático
            Indicações de Cobertura

            Cobertura: Child A ou B com carcinoma hepático primário, doença restrita ao fígado, lesões <4cm
            Tecnologia ou Método Utilizado:
            Método: Laparotomia, Videolaparoscopia, Percutânea guiada por Ultrassonografia e/ou Tomografia Computadorizada`
      ],
      ['user', '{input}']
    ])
    const outputParser = new StringOutputParser()
    const chatModel = new ChatOpenAI({
      modelName: 'gpt-3.5-turbo',
      temperature: 0,
      streaming: false
    })
    // @ts-ignore
    const llmChain = prompt.pipe(chatModel).pipe(outputParser)

    const answer = await llmChain.invoke({
      input: data
    })

    console.log(answer)
  }

  // const docs = await textLoader(filePath)
  // console.log(docs)
}
// npx ts-node src/web_loader.ts
void main()
