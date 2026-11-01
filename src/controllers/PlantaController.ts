import { Request, Response } from "express";
import { Luminosidade } from "@prisma/client";
import * as PlantaRepository from "@repositories/PlantaRepository";

const validarPlanta = (dados: any, parcial: boolean): string | null => {
    const { nome, luminosidade, petFriendly, especie, preco, estoque, regaACadaDias } = dados;

    if (!parcial && (!nome || !luminosidade || petFriendly === undefined || !especie || preco === undefined || estoque === undefined || regaACadaDias === undefined)) {
        return "Dados incompletos para criar planta";
    }
        
    if (preco !== undefined) {
        if (!Number.isInteger(preco)) return "O preço deve ser um número inteiro.";
        if (preco <= 0) return "O preço deve ser maior que zero.";
    }

    if (estoque !== undefined) {
        if (!Number.isInteger(estoque)) return "O estoque deve ser um número inteiro.";
        if (estoque < 0) return "O estoque não pode ser negativo.";
    }

    if (regaACadaDias !== undefined) {
        if (!Number.isInteger(regaACadaDias)) return "O campo 'regaACadaDias' deve ser um número inteiro.";
        if (regaACadaDias < 1) return "O campo 'regaACadaDias' deve ser pelo menos 1.";
    }

    if (nome !== undefined && typeof nome !== "string") {
        return "O campo 'nome' deve ser uma string.";
    }

    if (especie !== undefined && typeof especie !== "string") {
        return "O campo 'especie' deve ser uma string.";
    }

    if (petFriendly !== undefined && typeof petFriendly !== "boolean") {
        return "O campo 'petFriendly' deve ser um valor booleano.";
    }


    if (luminosidade !== undefined && !Object.values(Luminosidade).includes(luminosidade)) {
        return "Luminosidade inválida. Deve ser 'SOMBRA', 'MEIA_SOMBRA' ou 'SOL_PLENO'";
    }

    return null;
};

export const createPlanta = async (req: Request, res: Response) => {
    try {
        const { nome, luminosidade, petFriendly, especie, preco, estoque, regaACadaDias } = req.body;
        
        const erro = validarPlanta(req.body, false);
        if (erro) {
            return res.status(400).json({ message: erro });
        }

        const planta = await PlantaRepository.createPlanta({ nome, luminosidade, petFriendly, especie, preco, estoque, regaACadaDias });
        return res.status(201).json(planta);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Erro ao criar planta" });
    }
};

export const readPlantaById = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id)) {
            return res.status(400).json({ message: "O id deve ser um número inteiro." });
        }

        const planta = await PlantaRepository.findPlantaById(id);

        if (!planta) {
            return res.status(404).json({ message: "Planta não encontrada." });
        }

        return res.status(200).json(planta);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Erro ao buscar planta." });
    }
};

export const readAllPlantas = async (req: Request, res: Response) => {
    try {
        const { luminosidade, petFriendly } = req.query;

        const filtros: { luminosidade?: Luminosidade; petFriendly?: boolean } = {};
        
        if (luminosidade !== undefined) {
            if (!Object.values(Luminosidade).includes(luminosidade as Luminosidade)) {
                return res.status(400).json({ message: "Luminosidade inválida. Deve ser 'SOMBRA', 'MEIA_SOMBRA' ou 'SOL_PLENO'" });
            }
            filtros.luminosidade = luminosidade as Luminosidade;
        }

        if (petFriendly !== undefined) {
            if (petFriendly !== "true" && petFriendly !== "false") {
                return res.status(400).json({ message: "O filtro 'petFriendly' deve ser 'true' ou 'false'." });
            }
            
            filtros.petFriendly = petFriendly === "true";
        }

        const plantas = await PlantaRepository.findAllPlantas(filtros);
        return res.status(200).json(plantas);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Erro ao buscar plantas." });
    }
};

export const updatePlanta = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { nome, luminosidade, petFriendly, especie, preco, estoque, regaACadaDias } = req.body;

    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: "O id deve ser um número inteiro." });
    }
    const erro = validarPlanta(req.body, true);
    if (erro) {
        return res.status(400).json({ message: erro });
    }

    const planta = await PlantaRepository.findPlantaById(id);

    if (!planta) {
      return res.status(404).json({ message: "Planta não encontrada." });
    }

    const updatedPlanta = await PlantaRepository.updatePlanta(id, {
      nome: nome,
      luminosidade: luminosidade,
      petFriendly: petFriendly,
      especie: especie,
      preco: preco,
      estoque: estoque,
      regaACadaDias: regaACadaDias
    });

    return res.status(200).json(updatedPlanta);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao atualizar planta." });
  }
};

export const deletePlanta = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        
        if (!Number.isInteger(id)) {
            return res.status(400).json({ message: "O id deve ser um número inteiro." });
        }

        const planta = await PlantaRepository.findPlantaById(id);

        if (!planta) {
            return res.status(404).json({ message: "Planta não encontrada." });
        }
        
        await PlantaRepository.deletePlanta(id);
        
        return res.status(204).send();
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Erro ao deletar planta." });
    }
};