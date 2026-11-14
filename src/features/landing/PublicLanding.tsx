import BeamWordmarkFooter from '../../components/landing/beam-wordmark-footer'
import { Features } from '../../components/landing/features-8'
import ResponsiveHeroBanner from '../../components/21st/responsive-hero-banner'
import { LandingNavigation } from './LandingNavigation'
import { LandingStory } from './LandingStory'
import './landing.css'

export function PublicLanding() {
  return (
    <main className="landing-page">
      <div className="landing-hero-wrap">
        <ResponsiveHeroBanner
          className="landing-banner"
          hideNavigation
          logoUrl="/brand/fieldnova-wordmark.svg"
          backgroundImageUrl="/images/landing-fields.png"
          navLinks={[]}
          ctaButtonText=""
          ctaButtonHref="/login"
          badgeLabel=""
          badgeText=""
          title="Le climat change."
          titleLine2="Décider avec le terrain."
          description="FieldNova rassemble observations, parcelles et rotations pour vous aider à comprendre les risques et choisir la suite avec méthode."
          primaryButtonText="Découvrir les modules"
          primaryButtonHref="#fonctionnalites"
          secondaryButtonText="Ouvrir FieldNova"
          secondaryButtonHref="/login"
          partnersTitle=""
          partners={[]}
        />
        <LandingNavigation />
      </div>
      <LandingStory />
      <section id="chiffres" className="landing-facts-wrap">
        <Features />
        <p className="facts-context">Les images de cette page sont des concepts d’interface. Leurs nombres et mesures illustrent la présentation, pas des données de parcelle en temps réel.</p>
      </section>
      <BeamWordmarkFooter
        className="landing-footer"
        brand="FieldNova"
        wordmark="FIELDNOVA"
        company="FieldNova"
        year={2026}
        socials={[]}
        credits={[]}
        background="#12351f"
        ink="#f6f4e8"
        muted="#c2ceb8"
        accent="#b6d78d"
        wordTop="#f6f4e8"
        wordFoot="#315a3b"
        columns={[
          { title: 'Plateforme', links: [{ label: 'Fonctionnalités', href: '#fonctionnalites' }, { label: 'Modules', href: '#modules' }, { label: 'Notre approche', href: '#chiffres' }] },
          { title: 'Accès', links: [{ label: 'Se connecter', href: '/login' }] },
        ]}
      />
    </main>
  )
}
