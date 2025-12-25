# Spring Boot 3.5.9 — Setup & Baseline

This doc explains how to lock Spring Boot to **3.5.9** in your project and how to install the Spring Boot CLI for local development.

## Lock Spring Boot version (recommended)

To ensure a consistent baseline across services, add the following to your project's `pom.xml` (parent POM or service POM):

```xml
<parent>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-parent</artifactId>
  <version>3.5.9</version>
</parent>
```

Alternatively, use the BOM approach in `dependencyManagement`:

```xml
<dependencyManagement>
  <dependencies>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-dependencies</artifactId>
      <version>3.5.9</version>
      <type>pom</type>
      <scope>import</scope>
    </dependency>
  </dependencies>
</dependencyManagement>
```

**Verification (CI)**: We add a CI job that validates any `pom.xml` in the repo references Spring Boot `3.5.9`.

## Install Spring Boot CLI (optional, local developer tooling)

The Spring Boot CLI is convenient for rapid prototyping. Recommended installation methods:

- macOS / Linux: SDKMAN (recommended)
  - Install SDKMAN: `curl -s "https://get.sdkman.io" | bash`
  - Install Spring CLI: `sdk install springboot 3.5.9`

- Windows:
  - Use Scoop: `scoop install springboot` (if available) or use WSL + SDKMAN.
  - Alternatively download the distribution from https://spring.io/tools and add to PATH.

Verify: `spring --version` should report `3.5.9`.

## Notes
- We consider Spring Boot version a **strong baseline** — changes should be made via an ADR and a documented upgrade plan.
- If your project doesn't have Maven or Spring modules, this file serves as a template for future services.
