/* eslint-disable @typescript-eslint/no-unused-vars */
import { ChatOpenAI } from '@langchain/openai'
import dotenv from 'dotenv'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { StringOutputParser } from '@langchain/core/output_parsers'
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

async function splitAnexII() {
  const filePath = 'dut_ans.txt'
  // Read the content of the file
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading file:', err)
      return
    }

    console.log(`File ${filePath} content read successfully.`)

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
      const outputFilePath = `dut/section_${index + 1}.txt`
      fs.writeFile(outputFilePath, section, 'utf8', (writeErr) => {
        if (writeErr) {
          console.error(`Error writing section ${index + 1} to file:`, writeErr)
        } else {
          console.log(`Section ${index + 1} written to ${outputFilePath}`)
        }
      })
    })
  })
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
async function inspectSection() {
  const filePath = 'dut/section_6.txt'
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

async function main() {
  splitAnexII()
}
// npx ts-node src/web_loader.ts
void main()
