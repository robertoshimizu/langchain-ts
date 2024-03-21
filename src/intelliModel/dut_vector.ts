/* eslint-disable @typescript-eslint/no-unused-vars */
import { ChatOpenAI } from '@langchain/openai'
import dotenv from 'dotenv'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { StringOutputParser } from '@langchain/core/output_parsers'
import { TextLoader } from 'langchain/document_loaders/fs/text'
import { MemoryVectorStore } from 'langchain/vectorstores/memory'
import { AttributeInfo } from 'langchain/schema/query_constructor'
import { OpenAIEmbeddings, OpenAI } from '@langchain/openai'
import { SelfQueryRetriever } from 'langchain/retrievers/self_query'
import { FunctionalTranslator } from 'langchain/retrievers/self_query/functional'
import { Document } from '@langchain/core/documents'
import {
  RunnablePassthrough,
  RunnableSequence
} from '@langchain/core/runnables'

dotenv.config()

// Chain elements

async function textLoader(filePath: string) {
  const loader = new TextLoader(filePath)
  const docs = await loader.load()

  return docs
}

const prompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    `Você deve analisar a diretriz de utilizacao de cobertura de saude fornecida e extrair as seguintes metadados essenciais:

            - numero: numero da DUT: number
            - nome: titulo completo da cobertura: string
            - indicacoes: list de sintomas ou condicao clinica do paciente específicos que justificam a cobertura do procedimento: string[]
            - metodo: lista de métodos ou tecnologias específicos aplicados no procedimento: string[]
          
            Apresente os metadados extraídos em formato JSON, seguindo este modelo para cada procedimento.         
            Assegure-se de que as informacoes de indicacoes e metodo sejam concisas e precisas, capturando apenas as informações essenciais. 
            O valores de indicacoes e metodos devem ser obrigatoriamente lista de strings.
            Ignore detalhes que não se encaixem nos três metadados solicitados.`
  ],
  ['user', '{input}']
])

const llmChain = () => {
  const chatModel = new ChatOpenAI({
    modelName: 'gpt-3.5-turbo-0125',
    temperature: 0.0
  }).bind({
    response_format: { type: 'json_object' }
  })
  const outputParser = new StringOutputParser()

  return prompt.pipe(chatModel).pipe(outputParser)
}

interface MetaDut {
  numero: number
  nome: string
  indicacoes: any
  metodo: any
}

// Takes a directory of text files and returns a list of documents
// in this case we got chapters of DUT from Anex II of RN 465/2021
// and we transform them into Document object, also generating metadata

async function text2Doc(fileDir: any) {
  const docs: any = []

  for (let i = 1; i < 6; i++) {
    const loadedDocs = await textLoader(`${fileDir}/section_${i}.txt`)
    const doc = loadedDocs[0]
    doc.pageContent = doc.pageContent.replace(/\r/g, '')
    // Extract and ask llm to generate metadata
    const meta = await llmChain().invoke({ input: doc.pageContent })
    doc.metadata = JSON.parse(meta.replace(/\r/g, ''))
    const metaDut = doc.metadata as MetaDut
    metaDut.indicacoes = metaDut.indicacoes.join(', ')
    metaDut.metodo = metaDut.metodo.join(', ')
    doc.metadata = metaDut

    // push to docs
    docs.push(doc)
  }
  return docs
}
import { formatDocumentsAsString } from 'langchain/util/document'

async function self_query() {
  console.log('Starting...')
  //const docs = await text2Doc('src/documents')
  console.log('Documents successfully generated ...')

  //console.log(docs)
  const docs = [
    new Document({
      pageContent:
        'DUT numero 1. ABLAÇÃO    POR RADIOFREQUÊNCIA/CRIOABLAÇÃO    DO    CÂNCER    PRIMÁRIOHEPÁTICO POR LAPAROTOMIA; ABLAÇÃO POR RADIOFREQUÊNCIA/CRIOABLAÇÃODO   CÂNCER   PRIMÁRIO   HEPÁTICO   POR   VIDEOLAPAROSCOPIA; ABLAÇÃO   POR RADIOFREQUÊNCIA/CRIOABLAÇÃO PERCUTÂNEA DO CÂNCER PRIMÁRIO HEPÁTICO GUIADA POR ULTRASSONOGRAFIA E/OU TOMOGRAFIA COMPUTADORIZADA 1. Cobertura obrigatória para pacientes Child A ou B com carcinoma hepático primário quando a doença for restrita ao fígado e as lesões forem menores que 4cm.  ',
      metadata: {
        numero: 1,
        nome: 'ABLACAO POR RADIOFREQUENCIA/CRIOABLAÇÃO DO CÂNCER PRIMÁRIO HEPÁTICO',
        indicacao:
          'Carcinoma hepático primário restrito ao fígado, Lesões menores que 4cm, Pacientes Child A ou B',
        metodo:
          'Ablação por radiofrequência, Crioablação, Laparotomia, Videolaparoscopia, Ablação percutânea guiada por ultrassonografia e/ou tomografia computadorizada'
      }
    }),
    new Document({
      pageContent:
        'DUT numero 2. ACILCARNITINAS, PERFIL QUALITATIVO E/OU QUANTITATIVO COM ESPECTROMETRIA DE MASSA EM TANDEM  1. Cobertura obrigatória quando preenchido pelo menos um dos seguintes critérios: a.  crianças  de  qualquer  idade  que  apresentem  um  episódio  ou  episódios recorrentes  de  hipoglicemia  hipocetótica  ou  deterioração  neurológica  rápida (letargia,  ataxia,  convulsões  ou  coma),  precipitada  por  jejum  prolongado,  ou baixa   ingesta,   como   por   exemplo,   por   vômitos,   ou   por   aumento   das necessidades energéticas (exercício prolongado, febre, infecções); b. crianças de qualquer idade com síndrome de Reye ou “Reye-like” (encefalopatia aguda não inflamatória com hiperamonemia e disfunção hepática); c. pacientes de qualquer idade com cardiomiopatia dilatada ou hipertrófica sem diagnóstico etiológico; d. pacientes de qualquer idade com miopatia esquelética (fraqueza e dor muscular, episódios de rabdomiólise) ou doenças neuromusculares.  2. Cobertura obrigatória para pacientes assintomáticos, de qualquer idade, quando preenchido pelo menos um dos seguintes critérios abaixo:  a. História de irmã(o) afetado por defeito de beta-oxidação dos ácidos graxos ou acilcarnitinas;  b. História de irmã(o) com morte súbita de etiologia não definida;  c. História  de  mãe  ter  apresentado,  durante  a  gestação do  paciente,  síndrome HELLP (hemólise,  enzimas  hepáticas  aumentadas  e  baixa  contagem  de plaquetas) ou Fígado Gorduroso Agudo da Gravidez.   Método de análise espectrometria de massas em tandem qualitativo e quantitativo. Referência  Bibliográfica:  Tandem  Mass  Spectrometry  in  Clinical Diagnosis  in  Nenad Blau; et al. Physician’s guide to the laboratory diagnosis of metabolic diseases. Berlin: Springer, 2003, 2nd Ed. ISBN 3-540-42542-X \n',
      metadata: {
        numero: 2,
        nome: 'ACILCARNITINAS, PERFIL QUALITATIVO E/OU QUANTITATIVO COM ESPECTROMETRIA DE MASSA EM TANDEM',
        indicacao:
          "Crianças de qualquer idade com episódios recorrentes de hipoglicemia hipocetótica ou deterioração neurológica rápida precipitada por jejum prolongado, baixa ingesta ou aumento das necessidades energéticas, Crianças de qualquer idade com síndrome de Reye ou 'Reye-like', Pacientes de qualquer idade com cardiomiopatia dilatada ou hipertrófica sem diagnóstico etiológico, Pacientes de qualquer idade com miopatia esquelética ou doenças neuromusculares",
        metodo: 'Espectrometria de massas em tandem qualitativo e quantitativo'
      }
    }),
    new Document({
      pageContent:
        'DUT numero 3. ANGIOTOMOGRAFIA CORONARIANA 1. Cobertura obrigatória quando preenchido pelo menos um dos seguintes critérios (realização apenas em aparelhos multislice com 64 colunas de detectores ou mais): a. avaliação inicial de pacientes sintomáticos com probabilidade pré-teste de 10 a 70% calculada segundo os critérios de Diamond Forrester revisado1, como uma opção  aos  outros  métodos  diagnósticos  de  doença  arterial  coronariana, conforme tabela a seguir: Probabilidade pré-teste em pacientes com dor torácica (%) Idade Angina Típica Angina Atípica Dor não anginosa Homem Mulher Homem Mulher Homem Mulher 30-39 59,1 22,5 28,9 9,6 17,7 5,3 40-49 68,9 36,7 38,4 14 24,8 8 50-59 77,3 47,1 48,9 20 33,6 11,7 60-69 83,9 57,7 59,4 27,7 43,7 16,9 70-79 88,9 67,7 69,2 37 54,4 23,8 >80 92,5 76,3 77,5 47,4 64,6 32,3 (adaptado de T.S.S. Genders ET AL, 2011)  b.  dor  torácica  aguda,  em  pacientes  com  TIMI  RISK  1  e  2,  com  sintomas compatíveis com síndrome coronariana aguda ou equivalente anginoso e sem alterações isquêmicas ao ECG e marcadores de necrose miocárdica;  c.  para  descartar  doença  coronariana  isquêmica,  em pacientes  com  diagnóstico estabelecido  de  insuficiência  cardíaca  (IC)  recente,  onde  permaneça  dúvida sobre   a   etiologia   da   IC   mesmo   após   a   realização   de   outros   exames complementares;  d.  em  pacientes  com  quadro  clínico  e  exames  complementares  conflitantes, quando  permanece  dúvida  diagnóstica  mesmo  após  a  realização  de  exames funcionais para avaliação de isquemia; e. pacientes com suspeita de coronárias anômalas.   Referências Bibliográficas: 1. Genders TS, Steyerberg EW, Alkadhi H, Leschka S, Desbiolles L, Nieman K, Galema TW,  Meijboom WB,  Mollet  NR,  de  Feyter  PJ,  Cademartiri  F,  Maffei  E,  Dewey  M, Zimmermann  E,  Laule  M,  Pugliese  F,  Barbagallo  R,  Sinitsyn  V,  Bogaert  J, Goetschalckx K, Schoepf UJ, Rowe GW, Schuijf JD, Bax JJ, de Graaf FR, Knuuti J, Kajander  S,  van  Mieghem  CA,  Meijs  MF,  Cramer  MJ,  Gopalan  D,  Feuchtner  G, Friedrich G, Krestin GP, Hunink MG. A clinical prediction rule for the diagnosis of coronary artery disease: validation, updating, and extension. Eur Heart J. 2011 2. Jensen JM, Voss M, Hansen VB, Andersen LK, Johansen PB, Munkholm H, Nørgaard BL. Risk stratification of patients suspected of coronary artery disease: comparison of five different models. Atherosclerosis. 2012 Feb;220(2):557-62.  3. Mark DB, Berman DS, Budoff MJ, et al. ACCF/ACR/AHA/NASCI/SAIP/SCAI/SCCT 2010   expert   consensus   document   on   coronary   computed   tomographic angiography: a report of the American College of Cardiology Foundation Task Force on Expert Consensus Documents. Circulation 2010;121:2509-43. 4. Taylor AJ, Cerqueira M, Hodgson JM, et al. ACCF/SCCT/ACR/AHA/ASE/ASNC/NASCI/SCAI/SCMR    2010    Appropriate    Use Criteria for Cardiac Computed Tomography. A Report of the American College of Cardiology  Foundation  Appropriate  Use  Criteria  Task  Force,  the  Society  of Cardiovascular  Computed  Tomography,  the  American  College  of  Radiology,  the American  Heart  Association,  the  American  Society  of  Echocardiography,  the American   Society   of   Nuclear   Cardiology,   the   North   American   Society   for Cardiovascular   Imaging,   the   Society   for   Cardiovascular   Angiography   and Interventions, and the Society for Cardiovascular Magnetic Resonance. Circulation 2010;122:e525-55. 5. Min JK, Shaw LJ, Berman DS. The present state of coronary computed tomography angiography a process in evolution. J Am Coll Cardiol;55:957-65. 6. [Guideline of Sociedade Brasileira de Cardiologia for Resonance and cardiovascular tomography. Executive Summary]. Arq Bras Cardiol 2006;87 Suppl 3:e1-12. 7. Dennie CJ, Leipsic J, Brydie A. Canadian Association of Radiologists:  Consensus Guidelines and Standards for Cardiac CT. Can Assoc Radiol J 2009;60:19-34. 8. Diamond  GA,  Kaul  S.  Bayesian  classification  of  clinical  practice  guidelines. Arch Intern Med 2009;169:1431-5. 9. Pryor DB, Shaw L, McCants CB, et al. Value of the history and physical in identifying patients   at   increased   risk   for   coronary   artery   disease. Ann   Intern   Med 1993;118:81-90. 10. Diamond  GA,  Forrester  JS.  Analysis  of  probability  as  an  aid  in  the  clinical diagnosis of coronary-artery disease. N Engl J Med 1979;300:1350-8. 11. Gibbons  RJ,  Balady  GJ,  Bricker  JT,  et  al.  ACC/AHA  2002  guideline  update  for exercise   testing:   summary   article:   a   report   of   the   American   College   of Cardiology/American   Heart   Association   Task   Force   on   Practice   Guidelines (Committee   to   Update   the   1997   Exercise   Testing   Guidelines). Circulation 2002;106:1883-92. 12. Gibbons RJ, Abrams J, Chatterjee K, et al. ACC/AHA 2002 guideline update for the management of patients with chronic stable angina--summary article: a report of the American College of Cardiology/American Heart Association Task Force on Practice  Guidelines  (Committee  on  the  Management  of  Patients  With  Chronic Stable Angina). Circulation 2003;107:149-58. ',
      metadata: {
        numero: 3,
        nome: 'ANGIOTOMOGRAFIA CORONARIANA',
        indicacao: 'coronariana',
        metodo:
          'Angiotomografia coronariana realizada em aparelhos multislice com 64 colunas de detectores ou mais'
      }
    }),
    new Document({
      pageContent:
        'DUT numero 4. ANTICORPOS ANTI PEPTÍDEO CÍCLICO CITRULINADO - IGG (ANTI CCP)  1. Cobertura obrigatória na investigação diagnóstica de Artrite Reumatóide, quando o fator reumatóide for negativo.',
      metadata: {
        numero: 4,
        nome: 'ANTICORPOS ANTI PEPTÍDEO CÍCLICO CITRULINADO - IGG (ANTI CCP)',
        indicacao:
          'Investigação diagnóstica de Artrite Reumatóide com fator reumatóide negativo',
        metodo: ''
      }
    }),
    new Document({
      pageContent:
        'DUT numero 5. AUDIOMETRIA    VOCAL    COM    MENSAGEM    COMPETITIVA/    AVALIAÇÃO    DO PROCESSAMENTO AUDITIVO CENTRAL 1.  Cobertura  obrigatória  para  pacientes  a  partir  de  3  anos  de  idade,  conforme indicação do médico assistente, quando preenchido pelo menos um dos critérios do Grupo I e nenhum dos critérios do Grupo II:  Grupo I a. dificuldades de aprendizagem;  b. dificuldade de compreensão em ambientes ruidosos;  c. dificuldade de comunicação oral e/ou escrita;  d. agitados, hiperativos ou muito quietos;  e. alteração de comportamento e/ou de atenção;  f. dificuldades auditivas não orgânicas (resultado de audiometria tonal normal). Grupo II a. pacientes com habilidades de linguagem receptiva e emissiva insuficientes para compreender  as  tarefas  verbais  solicitadas  ou  que  apresentem  problemas cognitivBos; b. ausência de avaliação audiológica básica prévia.   Referências Bibliográficas: 1. Momensohn-Santos,  T.  M.;  Branco-Barreiro,  F.  C.  A. - Avaliação  e  Intervenção Fonoaudiológica no Transtorno de Processamento Auditivo Central – In: Ferreira, L. P. (Org.) – Tratado de Fonoaudiologia – São Paulo: Roca, 2004. 2. Pereira, L. D. – Avaliação do Processamento Auditivo Central. In: Filho, O. L. (Org.) – Tratado de Fonoaudiologia – 2a. edição, Ribeirão Preto, SP: Tecmedd, 2005. ',
      metadata: {
        numero: 5,
        nome: 'AUDIOMETRIA VOCAL COM MENSAGEM COMPETITIVA / AVALIAÇÃO DO PROCESSAMENTO AUDITIVO CENTRAL',
        indicacao:
          'Dificuldades de aprendizagem, Dificuldade de compreensão em ambientes ruidosos, Dificuldade de comunicação oral e/ou escrita, Agitados, hiperativos ou muito quietos, Alteração de comportamento e/ou de atenção, Dificuldades auditivas não orgânicas (resultado de audiometria tonal normal)',
        metodo:
          'Audiometria vocal com mensagem competitiva, Avaliação do processamento auditivo central'
      }
    })
  ]

  const attributeInfo: AttributeInfo[] = [
    {
      name: 'numero',
      description:
        'numero da DUT - Diretriz de Utilizacao para Cobertura de Procedimento',
      type: 'integer'
    },
    {
      name: 'nome',
      description: 'Nome da DUT',
      type: 'string or array of strings'
    },
    {
      name: 'indicacao',
      description: 'indicacoes para a DUT',
      type: 'string or array of strings'
    },
    {
      name: 'metodo',
      description:
        'lista de métodos ou tecnologias específicos aplicados na DUT',
      type: 'string or array of strings'
    }
  ]
  const embeddings = new OpenAIEmbeddings()
  const llm = new OpenAI()
  const documentContents =
    'Diretrizes de Utilizacao (DUT) para Cobertura de Procedimentos na Saude Suplementar publicados no anexo 2 da Resolucao 465/2021 da ANS'
  const vectorStore = await MemoryVectorStore.fromDocuments(docs, embeddings)
  const retriever = vectorStore.asRetriever(1)

  const dogs = await retriever.getRelevantDocuments(
    'Qual DUT tem indicacao para coronariana?'
  )
  console.log('docs:', dogs)

  // const selfQueryRetriever = await SelfQueryRetriever.fromLLM({
  //   llm,
  //   vectorStore,
  //   documentContents,
  //   attributeInfo,
  //   /**
  //    * We need to use a translator that translates the queries into a
  //    * filter format that the vector store can understand. We provide a basic translator
  //    * translator here, but you can create your own translator by extending BaseTranslator
  //    * abstract class. Note that the vector store needs to support filtering on the metadata
  //    * attributes you want to query on.
  //    */
  //   structuredQueryTranslator: new FunctionalTranslator()
  // })

  // selfQueryRetriever.structuredQueryTranslator

  // console.log('Self querying ...', selfQueryRetriever.structuredQueryTranslator)
  // try {
  //   const query1 = await selfQueryRetriever.getRelevantDocuments(
  //     'O que diz a DUT 4?'
  //   )
  //   console.log('query1:', query1, '\n')
  //   const query2 = await selfQueryRetriever.getRelevantDocuments(
  //     'Qual a DUT cujo nome que tem haver com ACILCARNITINAS?'
  //   )
  //   console.log('query2:', query2, '\n')
  //   const query3 = await selfQueryRetriever.getRelevantDocuments(
  //     'Qual DUT tem indicacao para coronariana?'
  //   )
  //   console.log('query3:', query3, '\n')
  //   const query4 = await selfQueryRetriever.getRelevantDocuments(
  //     'Qual DUT tem metodo de Ablação por radiofrequência?'
  //   )
  //   console.log('query4:', query4, '\n')
  // } catch (error) {
  //   console.log('Error:', error)
  // }
}

async function self_query_from_langchain_example() {
  const dogs = [
    new Document({
      pageContent:
        'A bunch of scientists bring back dinosaurs and mayhem breaks loose',
      metadata: { year: 1993, rating: 7.7, genre: 'science fiction' }
    }),
    new Document({
      pageContent:
        'Leo DiCaprio gets lost in a dream within a dream within a dream within a ...',
      metadata: { year: 2010, director: 'Christopher Nolan', rating: 8.2 }
    }),
    new Document({
      pageContent:
        'A psychologist / detective gets lost in a series of dreams within dreams within dreams and Inception reused the idea',
      metadata: { year: 2006, director: 'Satoshi Kon', rating: 8.6 }
    }),
    new Document({
      pageContent:
        'A bunch of normal-sized women are supremely wholesome and some men pine after them',
      metadata: { year: 2019, director: 'Greta Gerwig', rating: 8.3 }
    }),
    new Document({
      pageContent: 'Toys come alive and have a blast doing so',
      metadata: { year: 1995, genre: 'animated' }
    }),
    new Document({
      pageContent:
        'Three men walk into the Zone, three men walk out of the Zone',
      metadata: {
        year: 1979,
        director: 'Andrei Tarkovsky',
        genre: 'science fiction, drama',
        rating: 9.9
      }
    })
  ]

  /**
   * Next, we define the attributes we want to be able to query on.
   * in this case, we want to be able to query on the genre, year, director, rating, and length of the movie.
   * We also provide a description of each attribute and the type of the attribute.
   * This is used to generate the query prompts.
   */
  const attributeInfo: AttributeInfo[] = [
    {
      name: 'genre',
      description: 'The genre of the movie',
      type: 'string or array of strings'
    },
    {
      name: 'year',
      description: 'The year the movie was released',
      type: 'number'
    },
    {
      name: 'director',
      description: 'The director of the movie',
      type: 'string'
    },
    {
      name: 'rating',
      description: 'The rating of the movie (1-10)',
      type: 'number'
    },
    {
      name: 'length',
      description: 'The length of the movie in minutes',
      type: 'number'
    }
  ]

  /**
   * Next, we instantiate a vector store. This is where we store the embeddings of the documents.
   * We also need to provide an embeddings object. This is used to embed the documents.
   */
  const embeddings = new OpenAIEmbeddings()
  const llm = new OpenAI({
    modelName: 'gpt-4-0613',
    temperature: 0.1
  })
  const documentContents = 'Brief summary of a movie'
  const vectorStore = await MemoryVectorStore.fromDocuments(dogs, embeddings)
  const selfQueryRetriever = await SelfQueryRetriever.fromLLM({
    llm,
    vectorStore,
    documentContents,
    attributeInfo,
    /**
     * We need to use a translator that translates the queries into a
     * filter format that the vector store can understand. We provide a basic translator
     * translator here, but you can create your own translator by extending BaseTranslator
     * abstract class. Note that the vector store needs to support filtering on the metadata
     * attributes you want to query on.
     */
    structuredQueryTranslator: new FunctionalTranslator()
  })

  /**
   * Now we can query the vector store.
   * We can ask questions like "Which movies are less than 90 minutes?" or "Which movies are rated higher than 8.5?".
   * We can also ask questions like "Which movies are either comedy or drama and are less than 90 minutes?".
   * The retriever will automatically convert these questions into queries that can be used to retrieve documents.
   */
  const query1 = await selfQueryRetriever.getRelevantDocuments(
    'Which movies are less than 90 minutes?'
  )
  const query2 = await selfQueryRetriever.getRelevantDocuments(
    'Which movies are rated higher than 8.5?'
  )
  const query3 = await selfQueryRetriever.getRelevantDocuments(
    'Which movies are directed by Greta Gerwig?'
  )
  const query4 = await selfQueryRetriever.getRelevantDocuments(
    'Which movies are either comedy or drama?'
  )
  console.log('query1:', query1, '\n')
  console.log('query2:', query2, '\n')
  console.log('query3:', query3, '\n')
  console.log('query4:', query4, '\n')
}
// npx ts-node src/intelliModel/dut_vector.ts
void self_query()
