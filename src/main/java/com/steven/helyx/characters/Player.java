package com.steven.helyx.characters;

import com.steven.helyx.characters.skills.Skill;
import com.steven.helyx.characters.skills.Utility.BuffSkill;
import com.steven.helyx.game.*;
import com.steven.helyx.items.*;
import com.steven.helyx.utilities.*;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Scanner;

public class Player {
    private String name;
    private Class playerClass;
    private int level;
    private int xp;
    private int gold;
    private int currentEnergy;
    private int maxEnergy;
    private int maxMana;
    private int currentMana;
    private int maxHP;
    private int currentHP;
    private int strengthBuff;
    private int defenseBuff;
    private int dexterityBuff;
    private int buffTimer;
    private Map<String, Integer> playerStats;
    private int playerPoints;
    private Equipment equippedWeapon;
    private Equipment equippedArmor;
    private Inventory inventory;
    private ArrayList<Skill> additionalSkills;
    private ArrayList<BuffSkill> buffs;
    private Random random;

    public Player(String name, Class playerClass) {
        this.name = name;
        this.playerClass = playerClass;
        this.level = 1;
        this.xp = 0;
        this.gold = 100;
        this.maxEnergy = 20;
        this.currentEnergy = maxEnergy;
        this.playerStats = new LinkedHashMap<>();

        playerStats.put("Strength", 5); // base damage
        playerStats.put("Defense", 5); // base defense
        playerStats.put("Dexterity", 5); // critical chance & evasion
        playerStats.put("Constitution", 0); // increases health
        this.playerPoints = 2;

        this.maxMana = 40;
        this.currentMana = maxMana;
        this.maxHP = 100;
        this.currentHP = maxHP;
        this.additionalSkills = new ArrayList<>();
        this.buffs = new ArrayList<>();
        this.inventory = new Inventory();
        this.random = new Random();
    }

    public String getName() {
        return name;
    }

    public void gainXP(int amount) {
        xp += amount;
        levelUp();
    }

    private void levelUp() {
        int xpThreshold = level * 100;
        if (xp >= xpThreshold) {
            level++;
            playerPoints += 2;
            xp -= xpThreshold;
            currentHP = maxHP;
            currentMana = maxMana;
            currentEnergy = maxEnergy;
        }
    }

    public Inventory getInventory() {
        return inventory;
    }

    public void displayInfo() {
        UserInterface.clearConsole();
        System.out.println("====================================================");
        System.out.print("||  " + name + " (" + playerClass.getName() + ")");
        System.out.println("   Level: " + level + " (XP: " + xp + "/" + level * 100 + ")" );
        System.out.println("||  Battle Power: "+ getBattlePower() + "         Gold: " + gold);
        System.out.println("||  HP: " + currentHP + "/" + maxHP + "   MP: " + currentMana + "/" + maxMana + "   Energy: " + currentEnergy + "/" + maxEnergy);
        
        System.out.println("====================================================\n");
    }

    public boolean isAlive() {
        return currentHP > 0;
    }

    public Class getCurrentClass() {
        return playerClass;
    }

    public ArrayList<Skill> getSkills() {
        ArrayList<Skill> classSkills = playerClass.getClassSkills() != null ? playerClass.getClassSkills() : new ArrayList<>();
        classSkills.addAll(additionalSkills);
        return classSkills;
    }

    public void changeClass(Class newClass) {
        if (newClass != playerClass) {
            playerClass = newClass;
            System.out.println("> You changed your class to " + newClass.getName() + "!");
        } else {
            System.out.println("> You've chosen this class already!");
        }
    }
    
    public void equipItem(Equipment newEquipment) {
        if (newEquipment == null) return;

        switch (newEquipment.getType()) {
            case 1: // weapon
                if (equippedWeapon != null) {
                    equippedWeapon.unequip();
                    System.out.println("> You unequipped " + equippedWeapon.getName() + ".");
                }
                if (equippedWeapon == newEquipment) {
                    equippedWeapon = null;
                } else {
                    equippedWeapon = newEquipment;
                    equippedWeapon.equip();
                    System.out.println("> You equipped " + equippedWeapon.getName() + ".");
                }
                break;
            case 2: // armor
                if (equippedArmor != null) {
                    equippedArmor.unequip();
                    System.out.println("> You unequipped " + equippedArmor.getName() + ".");
                }
                if (equippedArmor == newEquipment) {
                    equippedArmor = null;
                } else {
                    equippedArmor = newEquipment;
                    equippedArmor.equip();
                    System.out.println("> You equipped " + equippedArmor.getName() + ".");
                }
                break;
            default:
                System.out.println("> This item can't be equipped.");
        }
    }

    public void useItem(Usable usableItem) {
        System.out.println("> You used a " + usableItem.getName() + ".");

        int bonusPoints = usableItem.getBonusPoints();
        switch (usableItem.getType()) {
            case 1: addHP(bonusPoints); break;
            case 2: gainMana(bonusPoints); break;
            case 3: gainEnergy(bonusPoints); break;
            case 4:
                double percentage = bonusPoints / 100.0; 
                addHP((int)(this.maxHP * percentage));
                gainMana((int)(this.maxMana * percentage));
                gainEnergy((int)(this.maxEnergy * percentage)); break;
        }
    }

    public Equipment getEquippedWeapon() {
        return equippedWeapon;
    }

    public Equipment getEquippedArmor() {
        return equippedArmor;
    }

    public void addBuff(BuffSkill buff) {
        buffs.add(buff);
        modifyBuff("strength", buff.getStrengthBuff());
        modifyBuff("defense", buff.getDefenseBuff());
        modifyBuff("dexterity", buff.getDexterityBuff());
    }

    public void resetBuffs() {
        for(int i = 0; i < buffs.size(); i++) {
            modifyBuff("strength", -buffs.get(i).getStrengthBuff());
            modifyBuff("defense", -buffs.get(i).getDefenseBuff());
            modifyBuff("dexterity", -buffs.get(i).getDexterityBuff());
            buffs.get(i).resetBuffTimer();
            buffs.remove(i);
        }
    }

    public void decreaseBuffsTimer() {
        for(int i = 0; i < buffs.size(); i++) {
            buffs.get(i).decreaseBuffTimer();
            if (buffs.get(i).getBuffTimer() <= 0) {
                modifyBuff("strength", -buffs.get(i).getStrengthBuff());
                modifyBuff("defense", -buffs.get(i).getDefenseBuff());
                modifyBuff("dexterity", -buffs.get(i).getDexterityBuff());
                buffs.remove(i);
            }
        }
    }

    public int getBuff(String type) {
        int buffValue = 0;
        switch (type.toLowerCase()) {
            case "strength":
                buffValue = strengthBuff;
                break;
            case "defense":
                buffValue = defenseBuff;
                break;
            case "dexterity":
                buffValue = dexterityBuff;
                break;
        }
        return buffValue;
    }

    public void modifyBuff(String type, int amount) {
        switch (type.toLowerCase()) {
            case "strength":
                strengthBuff = Math.max(0, strengthBuff + amount);
                break;
            case "defense":
                defenseBuff = Math.max(0, defenseBuff + amount);
                break;
            case "dexterity":
                dexterityBuff = Math.max(0, dexterityBuff + amount);
                break;
            default:
                throw new IllegalArgumentException("Invalid buff type: " + type);
        }
    }


    public int getBattlePower() {
        int weaponAttack = equippedWeapon != null ? equippedWeapon.getAttackBonus() : 0;
        int armorDefense = equippedArmor != null ? equippedArmor.getDefenseBonus() : 0;
        int strength = getStrength() + weaponAttack;
        int defense = getDefense() + armorDefense;
        int dexterity = getDexterity();
        return (int)((maxHP * 0.5) + (strength * 2) + (defense * 1.5) + (dexterity * 1.2));
    }

    public int getStrength() {
        return playerStats.get("Strength") + playerClass.getStrengthBonus();
    }

    public int getDefense() {
        return playerStats.get("Defense") + playerClass.getDefenseBonus();
    }

    public int getDexterity() {
        return playerStats.get("Dexterity") + playerClass.getDexterityBonus();
    }

    public int getMana() {
        return currentMana;
    }

    public int getMaxMana() {
        return maxMana;
    }

    public void gainMana(int mana) {
        currentMana += mana;
        if (currentMana > maxMana) currentMana = maxMana;
    }

    public void reduceMana(int mana) {
        currentMana -= mana;
        if (currentMana < 0) currentMana = 0;
    }

    public int getEnergy() {
        return currentEnergy;
    }

    public int getMaxEnergy() {
        return maxEnergy;
    }

    public void gainEnergy(int energy) {
        currentEnergy += energy;
        if (currentEnergy > maxEnergy) currentEnergy = maxEnergy;
    }

    public void setEnergy(int energy) {
        currentEnergy = energy;
        if (currentEnergy > maxEnergy) currentEnergy = maxEnergy;
    }

    public void reduceEnergy(int energy) {
        currentEnergy -= energy;
        if (currentEnergy < 0) currentEnergy = 0;
    }

    public int getGolds() {
        return gold;
    }

    public void takeGold(int golds) {
        gold -= golds;
        if (gold < 0) gold = 0;
    }

    public void gainGold(int golds) {
        gold += golds;
        if (gold >= 99999) gold = 99999;
    }

    public int getStats(String stats) {
        return playerStats.get(stats);
    }

    public int getCurrentHP() {
        return currentHP;
    }

    public int getMaxHP() {
        return maxHP;
    }

    public void addHP(int hp) {
        currentHP += hp;
        if (currentHP > maxHP) currentHP = maxHP;
    }

    public void setHP(int hp) {
        currentHP = hp;
        if (currentHP > maxHP) currentHP = maxHP;
    }

    public int attack() {
        int strength = getStrength();
        int dexterity = Math.min(getDexterity() + dexterityBuff, 20);
        int weaponDamage = equippedWeapon != null ? equippedWeapon.getAttackBonus() : 0;

        // base damage
        int baseDamage = strength + weaponDamage + strengthBuff;

        // critical chance
        boolean isCritical = random.nextInt(100) < dexterity * 2;
        if (isCritical) {
            System.out.println("> !! Critical Hit !!");
            return baseDamage * 2;
        }

        return baseDamage;
    }

    public int takeDamage(int rawDamage) { // armor def contributes 60%, weapon def contributes 30%, player def contributes 10%
        int armorDefense = equippedArmor != null ? equippedArmor.getDefenseBonus() : 0;
        int weaponDefense = equippedWeapon != null ? equippedWeapon.getDefenseBonus() : 0;
        int playerDefense = getDefense() + defenseBuff;
        double reductionPercentage = ((armorDefense * 0.55) + (weaponDefense * 0.25) + (playerDefense * 0.2)) / (rawDamage + 1);
        int finalDamage = Math.max(1, (int) (rawDamage * (1 - reductionPercentage)));
        currentHP -= finalDamage;
        if (currentHP < 0) currentHP = 0;

        int damageDifference = rawDamage - finalDamage;
        return damageDifference;
    }

    public void allocateStatPoint(int index) {
        List<String> keys = new ArrayList<>(playerStats.keySet());
        String stat = keys.get(index);
        if (playerPoints > 0 && playerStats.containsKey(stat)) {
            playerStats.put(stat, playerStats.get(stat) + 1);
            playerPoints--;
            if (stat.equals("Constitution")) {
                maxHP = 100 + playerStats.get("Constitution") * 10;
                currentHP = maxHP;
            }
            System.out.println("> " + stat + " increased! Remaining points: " + playerPoints);
            UserInterface.enterReturn();
        } else {
            System.out.println("Invalid allocation or no points left.");
            UserInterface.enterReturn();
        }
    }

    public void displayStatsMenu(Scanner scanner) {
        int strengthBonus = playerClass.getStrengthBonus() + (equippedWeapon != null ? equippedWeapon.getAttackBonus() : 0);
        int defenseBonus = playerClass.getDefenseBonus() + (equippedArmor != null ? equippedArmor.getDefenseBonus() : 0);
        int dexterityBonus = playerClass.getDexterityBonus();
        String additionalStrength = strengthBonus > 0 ? " (+" + strengthBonus + ")" : "";
        String additionalDefense = defenseBonus > 0 ? " (+" + defenseBonus + ")" : "";
        String additionalDexterity = dexterityBonus > 0 ? " (+" + dexterityBonus + ")" : "";
        boolean inStatsMenu = true;
        while (inStatsMenu) {
            displayInfo();
            System.out.println("========== Stats ==========");
            
            System.out.println("> Player Points: " + playerPoints);
            System.out.println();
            int i = 0; for (String stat : playerStats.keySet()) {
                i++;
                System.out.print("["+ i +"] " + stat + ": " + playerStats.get(stat));
                if (stat.equals("Strength")) {
                    System.out.println(additionalStrength);
                } else if (stat.equals("Defense")) {
                    System.out.println(additionalDefense);
                } else if (stat.equals("Dexterity")) {
                    System.out.println(additionalDexterity);
                } else System.out.println();
            }
            System.out.println("\n*) Class and Equipments can give stat bonus.\n");
            System.out.println("[0] Return to Main Menu");
            System.out.print("\nEnter stats to allocate on: ");
            
            int choice = scanner.nextInt();
            scanner.nextLine();
            if (choice == 0) { 
                inStatsMenu = false; 
                break; 
            } else if (choice > 0 && (choice - 1) < i){ 
                choice--; 
                allocateStatPoint(choice); 
            } else {
                System.out.println("Invalid choice!");
                UserInterface.enterReturn();
            }
        }
    }
}
