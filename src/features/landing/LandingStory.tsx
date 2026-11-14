import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import dashboardConcept from '../../../ui-concepts/01-dashboard.png'
import terrainConcept from '../../../ui-concepts/03-mon-terrain.png'
import scenariosConcept from '../../../ui-concepts/04-scenarios.png'
import assistantConcept from '../../../ui-concepts/05-assistant-chat-map.png'

const scenes = [
  {
    id: 'saison',
    title: 'Voir la saison à l’échelle de la parcelle.',
    copy: 'La vue d’ensemble relie climat, végétation et disponibilité des données sur une carte. L’Atlas permet ensuite de comparer les couches et les acquisitions.',
    modules: ['Vue d’ensemble', 'Atlas'],
    image: dashboardConcept,
    alt: 'Concept FieldNova avec globe, indicateurs climatiques et profil du sol',
  },
  {
    id: 'terrain',
    title: 'Comprendre le terrain, sans masquer les inconnues.',
    copy: 'Retrouvez les parcelles, les rotations et la composition du sol. Une mesure de terrain, une estimation cartographique et une zone sans donnée sont présentées comme trois niveaux distincts.',
    modules: ['Mon terrain'],
    image: terrainConcept,
    alt: 'Concept FieldNova de parcelle sélectionnée avec profil du sol et provenance',
  },
  {
    id: 'scenarios',
    title: 'Comparer plusieurs chemins avant d’agir.',
    copy: 'Les scénarios de rotation mettent les compromis en regard : fertilité, couverture, rendement et résilience. Les hypothèses et les observations restent différenciées.',
    modules: ['Scénarios'],
    image: scenariosConcept,
    alt: 'Concept FieldNova comparant trois scénarios de rotation sur une parcelle',
  },
  {
    id: 'assistant',
    title: 'Poser une question et voir sur quoi repose la réponse.',
    copy: 'L’assistant se comporte comme un chat contextualisé : il consulte les outils adaptés, relie ses réponses à la parcelle et laisse la carte visible. Données & confiance détaille ensuite les sources et leurs limites.',
    modules: ['Assistant', 'Données & confiance'],
    image: assistantConcept,
    alt: 'Concept FieldNova montrant un chat agricole à gauche et une carte de parcelles à droite',
  },
]

export function LandingStory() {
  const [visibleScenes, setVisibleScenes] = useState<string[]>([])
  const refs = useRef<Array<HTMLElement | null>>([])

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      setVisibleScenes((current) => {
        const next = new Set(current)
        entries.forEach((entry) => {
          const id = (entry.target as HTMLElement).dataset.scene
          if (id && entry.isIntersecting) next.add(id)
        })
        return [...next]
      })
    }, { threshold: 0.18 })
    refs.current.forEach((node) => node && observer.observe(node))
    return () => observer.disconnect()
  }, [])

  return (
    <div id="fonctionnalites" className="landing-story">
      <section className="story-intro">
        <p className="story-intro-copy">Des observations jusqu’au choix cultural, chaque vue garde la parcelle au centre.</p>
        <a href="#modules" className="story-scroll-link">Découvrir le parcours <ArrowDown size={17} /></a>
      </section>
      <div id="modules" className="story-scenes">
        {scenes.map((scene, index) => (
          <section
            className={`story-scene ${visibleScenes.includes(scene.id) ? 'is-visible' : ''}`}
            key={scene.id}
            data-scene={scene.id}
            ref={(node) => { refs.current[index] = node }}
          >
            <div className="story-copy">
              <h2>{scene.title}</h2>
              <p>{scene.copy}</p>
              <div className="story-modules" aria-label="Onglets présentés">
                {scene.modules.map((module) => <span key={module}>{module}</span>)}
              </div>
              {scene.id === 'assistant' && <Link className="story-link" to="/login">Entrer dans FieldNova <ArrowUpRight size={16} /></Link>}
            </div>
            <figure className="story-visual">
              <img src={scene.image} alt={scene.alt} loading={index === 0 ? 'eager' : 'lazy'} />
              <figcaption>{scene.modules.join(' · ')}</figcaption>
            </figure>
          </section>
        ))}
      </div>
    </div>
  )
}
